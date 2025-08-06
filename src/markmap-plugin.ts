/**
 * 虎鲸笔记 Markmap 插件
 * 移植自 Logseq Markmap 插件，实现节点级思维导图转换
 */

// 全局变量声明
declare const orca: any;
declare global {
  interface Window {
    markmap: any;
  }
}

// 插件状态
let pluginName: string;
let mindMapPanels: Map<string, string> = new Map(); // blockId -> panelId
let unsubscribe: any;

// Markmap库变量（将通过CDN动态加载）
let markmap: any;
let transformer: any;

// 动态加载Markmap库
async function loadMarkmap() {
  if (window.markmap) {
    markmap = window.markmap;
    transformer = window.markmap.Transformer;
    return;
  }

  // 创建script标签加载Markmap
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/markmap-view@0.15.8/dist/index.min.js';
  document.head.appendChild(script);

  await new Promise((resolve, reject) => {
    script.onload = () => {
      markmap = window.markmap;
      transformer = new markmap.Transformer();
      resolve(markmap);
    };
    script.onerror = reject;
  });
}

// 将块数据转换为Markdown
function blockToMarkdown(blockId: string, allBlocks: Record<string, any>, level: number = 1): string {
  const block = allBlocks[blockId];
  if (!block) return '';

  const indent = '#'.repeat(Math.min(level, 6)) + ' ';
  let markdown = indent + (block.text || '未命名块') + '\n\n';

  // 处理子块
  if (block.children && block.children.length > 0) {
    for (const childId of block.children) {
      if (allBlocks[childId]) {
        markdown += blockToMarkdown(childId, allBlocks, level + 1);
      }
    }
  }

  return markdown;
}

// 创建思维导图
async function createMindMap(blockId: string) {
  try {
    const allBlocks = orca.state.blocks;
    const block = allBlocks[blockId];
    
    if (!block) {
      orca.notify('error', '未找到指定块');
      return;
    }

    // 加载Markmap库
    if (!markmap) {
      orca.notify('info', '正在加载思维导图组件...');
      await loadMarkmap();
    }

    // 转换为Markdown
    const markdown = blockToMarkdown(blockId, allBlocks);
    console.log('Generated markdown:', markdown);

    // 转换为思维导图数据
    const { root, features } = transformer.transform(markdown);

    // 创建思维导图容器
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: 500px;
      border: 1px solid var(--orca-color-border, #e0e0e0);
      border-radius: 8px;
      background: var(--orca-color-bg-1, white);
    `;

    // 创建面板内容
    const panelContent = document.createElement('div');
    panelContent.style.cssText = `
      padding: 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
    `;

    const title = document.createElement('h3');
    title.textContent = `🧠 ${block.text || '思维导图'}`;
    title.style.cssText = `
      margin: 0 0 15px 0;
      color: var(--orca-color-text-1, #333);
      font-size: 18px;
    `;

    const controls = document.createElement('div');
    controls.style.cssText = 'margin-bottom: 15px; display: flex; gap: 10px;';
    
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 刷新';
    refreshBtn.style.cssText = `
      padding: 6px 12px;
      border: 1px solid var(--orca-color-border, #ccc);
      border-radius: 4px;
      background: var(--orca-color-bg-2, #f5f5f5);
      cursor: pointer;
      font-size: 12px;
    `;
    refreshBtn.onclick = () => createMindMap(blockId);

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📄 导出SVG';
    exportBtn.style.cssText = refreshBtn.style.cssText;
    exportBtn.onclick = () => exportMindMap(container);

    controls.appendChild(refreshBtn);
    controls.appendChild(exportBtn);

    panelContent.appendChild(title);
    panelContent.appendChild(controls);
    panelContent.appendChild(container);

    // 渲染思维导图
    const mm = markmap.Markmap.create(container, {
      colorFreezeLevel: 2,
      duration: 800,
      maxWidth: 300,
      initialExpandLevel: 3
    });
    
    mm.setData(root);
    mm.fit();

    // 关闭已存在的面板
    if (mindMapPanels.has(blockId)) {
      orca.nav.closePanel(mindMapPanels.get(blockId));
    }

    // 创建新面板
    const panelId = await orca.nav.addPanel(`markmap-${blockId}`, {
      title: '思维导图',
      view: 'custom',
      component: () => panelContent,
      position: 'right',
      width: '50%'
    });

    mindMapPanels.set(blockId, panelId);
    orca.notify('success', '思维导图已生成');

  } catch (error) {
    console.error('创建思维导图失败:', error);
    orca.notify('error', '生成思维导图失败');
  }
}

// 导出SVG
function exportMindMap(container: HTMLElement) {
  const svgElement = container.querySelector('svg');
  if (!svgElement) {
    orca.notify('error', '未找到思维导图内容');
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `mindmap-${Date.now()}.svg`;
  link.click();
  
  URL.revokeObjectURL(url);
  orca.notify('success', 'SVG已导出');
}

// 注入样式：在块前添加思维导图按钮
function injectStyles() {
  const styles = `
    .orca-repr-main-content::before {
      content: "\\f1c4"; /* tabler-icons 脑图图标 */
      font-family: "tabler-icons";
      speak: none;
      font-style: normal;
      font-weight: normal;
      font-variant: normal;
      text-transform: none;
      -webkit-font-smoothing: antialiased;
      margin-right: var(--orca-spacing-md, 8px);
      cursor: pointer;
      font-size: var(--orca-fontsize-md, 14px);
      color: var(--orca-color-text-3, #888);
      display: inline-block;
      translate: 0 1px;
      line-height: 1;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .orca-repr-main-content:hover::before {
      opacity: 1;
    }

    .orca-repr-main-content:hover::before:hover {
      color: var(--orca-color-primary, #007acc);
    }
  `;
  
  const styleEl = document.createElement("style");
  styleEl.dataset.role = pluginName;
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);
}

// 移除样式
function removeStyles() {
  const styleEls = document.querySelectorAll(`style[data-role="${pluginName}"]`);
  styleEls.forEach((el) => el.remove());
}

// 处理点击事件
function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target?.classList.contains("orca-repr-main-content")) return;

  const rect = target.getBoundingClientRect();
  const styles = window.getComputedStyle(target);
  const paddingLeft = parseFloat(styles.paddingLeft);
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const iconSize = 20 + (paddingLeft || 0);

  // 检查点击是否在图标区域
  if (x < 0 || x > iconSize || y < 0 || y > iconSize) return;

  const blockEl = target.closest(".orca-block") as HTMLElement;
  const blockId = blockEl?.dataset.id;

  if (!blockId) return;

  // 生成思维导图
  createMindMap(blockId);
}

// 插件加载函数
async function load(_name: string) {
  pluginName = _name;
  console.log(`Markmap插件 ${pluginName} 开始加载...`);

  // 注册命令
  orca.commands.registerCommand(
    `${pluginName}.createMindMap`,
    () => {
      // 获取当前选中的块
      const currentBlockId = orca.state.currentBlockId || Object.keys(orca.state.blocks)[0];
      if (currentBlockId) {
        createMindMap(currentBlockId);
      } else {
        orca.notify('warn', '请先选择一个块');
      }
    },
    '创建思维导图'
  );

  // 添加工具栏按钮
  orca.toolbar.registerToolbarButton(`${pluginName}.button`, {
    icon: 'ti ti-brain',
    tooltip: '生成思维导图',
    command: `${pluginName}.createMindMap`
  });

  // 注册快捷键
  orca.commands.registerShortcut(
    'Ctrl+Shift+M',
    `${pluginName}.createMindMap`
  );

  // 注入样式和事件监听
  injectStyles();
  document.body.addEventListener('click', onClick);

  console.log(`Markmap插件 ${pluginName} 加载完成`);
  orca.notify('success', 'Markmap插件已启用');
}

// 插件卸载函数
async function unload() {
  console.log('Markmap插件开始卸载...');

  // 关闭所有面板
  for (const [blockId, panelId] of mindMapPanels) {
    orca.nav.closePanel(panelId);
  }
  mindMapPanels.clear();

  // 移除事件监听
  document.body.removeEventListener('click', onClick);
  
  // 移除样式
  removeStyles();

  // 移除命令和UI
  orca.commands.unregisterCommand(`${pluginName}.createMindMap`);
  orca.toolbar.unregisterToolbarButton(`${pluginName}.button`);
  orca.commands.unregisterShortcut('Ctrl+Shift+M');

  // 清理订阅
  if (unsubscribe) {
    unsubscribe();
  }

  console.log('Markmap插件卸载完成');
  orca.notify('info', 'Markmap插件已禁用');
}

export { load, unload };