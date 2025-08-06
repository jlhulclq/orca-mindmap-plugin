/**
 * 虎鲸笔记大纲插件 - 简化版
 * 基于成熟插件模板重写
 */

// 全局变量声明
declare const orca: any;

// 全局变量
let pluginName: string;
let mindMapPanel: string | null = null;

// 工具函数：构建树形结构
function buildTree(blockId: string, allBlocks: Record<string, any>, level: number = 0): any {
  const block = allBlocks[blockId];
  if (!block) return null;

  const children = (block.children || [])
    .map((childId: string) => buildTree(childId, allBlocks, level + 1))
    .filter(Boolean);

  return {
    id: block.id,
    content: (block.text || '').substring(0, 200),
    children,
    level
  };
}

// 查找根块
function findRootBlocks(blocks: Record<string, any>): string[] {
  return Object.keys(blocks).filter(id => {
    const block = blocks[id];
    return !block.parent || !blocks[block.parent];
  });
}

// 渲染HTML
function renderTree(node: any, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  const fontSize = Math.max(12, 16 - depth * 2);
  const bullet = ['● ', '○ ', '▪ ', '▫ ', '‣ '][Math.min(depth, 4)];
  
  let html = `${indent}<div style="margin: 5px 0; font-size: ${fontSize}px; padding-left: ${depth * 20}px;">${bullet}${node.content}</div>\n`;
  
  for (const child of node.children) {
    html += renderTree(child, depth + 1);
  }
  
  return html;
}

// 主要功能：显示思维导图
async function showMindMap() {
  const currentBlocks = orca.state.blocks;
  
  if (!currentBlocks || Object.keys(currentBlocks).length === 0) {
    orca.notify('warn', '当前笔记没有内容块');
    return;
  }

  const rootBlockIds = findRootBlocks(currentBlocks);
  if (rootBlockIds.length === 0) {
    orca.notify('warn', '未找到根级块');
    return;
  }

  const trees = rootBlockIds.map(rootId => buildTree(rootId, currentBlocks)).filter(Boolean);
  
  let htmlContent = `
    <div style="padding: 20px; font-family: var(--orca-font-family, sans-serif);">
      <h3 style="margin: 0 0 15px 0; color: var(--orca-color-text-1, #333);">📖 笔记大纲结构</h3>
      <div style="border: 1px solid var(--orca-color-border, #e0e0e0); border-radius: 8px; padding: 15px; background: var(--orca-color-bg-2, #fafafa); max-height: 500px; overflow-y: auto;">
  `;
  
  for (const tree of trees) {
    htmlContent += renderTree(tree);
  }
  
  htmlContent += `
      </div>
      <p style="margin-top: 15px; font-size: 12px; color: var(--orca-color-text-3, #999);">💡 共 ${Object.keys(currentBlocks).length} 个块</p>
    </div>
  `;

  // 关闭现有面板
  if (mindMapPanel) {
    orca.nav.closePanel(mindMapPanel);
  }

  // 创建新面板
  mindMapPanel = await orca.nav.addPanel('outline-mindmap', {
    title: '大纲视图',
    view: 'custom',
    component: () => {
      const div = document.createElement('div');
      div.innerHTML = htmlContent;
      return div;
    },
    position: 'right',
    width: '40%'
  });

  orca.notify('success', '大纲视图已显示');
}

// 切换显示
function toggleMindMap() {
  if (mindMapPanel) {
    orca.nav.closePanel(mindMapPanel);
    mindMapPanel = null;
    orca.notify('info', '大纲视图已关闭');
  } else {
    showMindMap();
  }
}

// 插件加载函数
async function load(_name: string) {
  pluginName = _name;
  console.log(`大纲插件 ${pluginName} 开始加载...`);

  // 注册命令
  orca.commands.registerCommand(
    `${pluginName}.showMindMap`,
    showMindMap,
    '显示大纲视图'
  );

  orca.commands.registerCommand(
    `${pluginName}.toggleMindMap`,
    toggleMindMap,
    '切换大纲视图'
  );

  // 添加工具栏按钮
  orca.toolbar.registerToolbarButton(`${pluginName}.button`, {
    icon: 'ti ti-hierarchy',
    tooltip: '显示大纲视图',
    command: `${pluginName}.showMindMap`
  });

  // 注册快捷键
  orca.commands.registerShortcut(
    'Ctrl+M',
    `${pluginName}.toggleMindMap`
  );

  console.log(`大纲插件 ${pluginName} 加载完成`);
  orca.notify('success', '大纲插件已启用');
}

// 插件卸载函数
async function unload() {
  console.log('大纲插件开始卸载...');

  // 关闭面板
  if (mindMapPanel) {
    orca.nav.closePanel(mindMapPanel);
    mindMapPanel = null;
  }

  // 移除命令
  orca.commands.unregisterCommand(`${pluginName}.showMindMap`);
  orca.commands.unregisterCommand(`${pluginName}.toggleMindMap`);

  // 移除工具栏按钮
  orca.toolbar.unregisterToolbarButton(`${pluginName}.button`);

  // 移除快捷键
  orca.commands.unregisterShortcut('Ctrl+M');

  console.log('大纲插件卸载完成');
  orca.notify('info', '大纲插件已禁用');
}

export { load, unload };