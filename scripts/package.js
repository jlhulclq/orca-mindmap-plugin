// 插件打包脚本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始打包插件...');

// 检查必要文件
const requiredFiles = ['dist/index.js', 'icon.png', 'package.json'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ 缺少必要文件:', missingFiles);
  process.exit(1);
}

// 创建发布目录
const releaseDir = 'release';
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true });
}
fs.mkdirSync(releaseDir);

// 复制必要文件到发布目录
console.log('📁 复制插件文件...');

// 复制主文件
fs.copyFileSync('dist/index.js', path.join(releaseDir, 'index.js'));

// 复制图标
fs.copyFileSync('icon.png', path.join(releaseDir, 'icon.png'));

// 检查是否有样式文件
if (fs.existsSync('dist/style.css')) {
  console.log('📝 发现样式文件，将内联到JS中...');
  
  // 读取样式内容
  const cssContent = fs.readFileSync('dist/style.css', 'utf-8');
  const jsContent = fs.readFileSync(path.join(releaseDir, 'index.js'), 'utf-8');
  
  // 将CSS内容内联到JS中
  const inlineStyleCode = `
// 注入样式
(function() {
  const style = document.createElement('style');
  style.textContent = \`${cssContent.replace(/`/g, '\\`')}\`;
  document.head.appendChild(style);
})();

${jsContent}`;
  
  fs.writeFileSync(path.join(releaseDir, 'index.js'), inlineStyleCode);
  console.log('✅ 样式已内联到JS文件');
}

// 读取package.json并提取插件信息
const packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const pluginInfo = {
  name: packageInfo.name,
  version: packageInfo.version,
  description: packageInfo.description,
  orca: packageInfo.orca
};

// 创建插件信息文件
fs.writeFileSync(
  path.join(releaseDir, 'plugin.json'), 
  JSON.stringify(pluginInfo, null, 2)
);

// 复制README
if (fs.existsSync('README.md')) {
  fs.copyFileSync('README.md', path.join(releaseDir, 'README.md'));
}

console.log('✅ 插件打包完成！');
console.log('📦 发布文件位于:', path.resolve(releaseDir));
console.log('📋 文件清单:');

const files = fs.readdirSync(releaseDir);
files.forEach(file => {
  const filePath = path.join(releaseDir, file);
  const stats = fs.statSync(filePath);
  console.log(`   ${file} (${Math.round(stats.size / 1024)}KB)`);
});

console.log('');
console.log('🎯 安装说明:');
console.log('1. 将 release 目录复制到虎鲸笔记的插件目录');
console.log('2. 重命名为 outline-plugin');
console.log('3. 重启虎鲸笔记应用');
console.log('4. 在插件管理中启用插件');

// 可选：创建ZIP压缩包
try {
  execSync(`cd ${releaseDir} && zip -r ../outline-plugin-v${packageInfo.version}.zip .`);
  console.log(`📦 ZIP压缩包已创建: outline-plugin-v${packageInfo.version}.zip`);
} catch (error) {
  console.log('⚠️  未能创建ZIP压缩包（需要zip命令）');
}