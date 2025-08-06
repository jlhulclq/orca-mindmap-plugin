/**
 * 虎鲸笔记 Markmap 插件 - 简化版
 * 使用右键菜单触发，简化实现逻辑
 */

// 全局变量声明
declare const orca: any;

// 插件状态
let pluginName: string;
let mindMapPanels: Map<string, string> = new Map();

// 简单的Markdown转换器
function blockToMarkdown(blockId: string, allBlocks: Record<string, any>, level: number = 1): string {
  const block = allBlocks[blockId];
  if (!block) return '';

  const indent = '#'.repeat(Math.min(level, 6)) + ' ';
  const content = (block.text || '未命名块').replace(/[#*]/g, ''); // 清理特殊字符
  let markdown = indent + content + '\n\n';

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

// 创建简单的树形可视化（不依赖外部库）
async function createSimpleMindMap(blockId: string) {
  try {
    const allBlocks = orca.state.blocks;
    const block = allBlocks[blockId];
    
    if (!block) {
      orca.notify('error', '未找到指定块');
      return;
    }

    // 生成简单的层级结构
    function renderTree(nodeId: string, level: number = 0): string {
      const node = allBlocks[nodeId];
      if (!node) return '';
      
      const indent = '  '.repeat(level);
      const bullet = ['●', '○', '▪', '▫', '‣'][Math.min(level, 4)];
      const content = (node.text || '未命名').substring(0, 100);
      
      let html = `<div style="margin: 8px 0; padding-left: ${level * 24}px; font-size: ${16 - level}px; line-height: 1.4;">
        <span style="color: var(--orca-color-primary, #007acc); margin-right: 8px;">${bullet}</span>
        <span style="color: var(--orca-color-text-1, #333);">${content}</span>
      </div>`;
      
      if (node.children && node.children.length > 0) {
        for (const childId of node.children) {
          html += renderTree(childId, level + 1);
        }
      }
      
      return html;
    }

    const treeHtml = renderTree(blockId);

    // 创建面板内容
    const container = document.createElement('div');
    container.style.cssText = `
      padding: 20px;
      font-family: var(--orca-font-family, sans-serif);
      background: var(--orca-color-bg-1, white);
      height: 100%;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = `🧠 ${(block.text || '思维导图').substring(0, 50)}`;
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: var(--orca-color-text-1, #333);
      font-size: 18px;
      border-bottom: 2px solid var(--orca-color-primary, #007acc);
      padding-bottom: 10px;
    `;

    const content = document.createElement('div');
    content.innerHTML = treeHtml;
    content.style.cssText = `
      border: 1px solid var(--orca-color-border, #e0e0e0);
      border-radius: 8px;
      padding: 16px;
      background: var(--orca-color-bg-2, #fafafa);
      max-height: 600px;
      overflow-y: auto;
    `;

    const controls = document.createElement('div');
    controls.style.cssText = 'margin: 15px 0; display: flex; gap: 10px;';
    
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 刷新';
    refreshBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid var(--orca-color-primary, #007acc);
      border-radius: 4px;
      background: var(--orca-color-primary, #007acc);
      color: white;
      cursor: pointer;
      font-size: 14px;
    `;
    refreshBtn.onclick = () => createSimpleMindMap(blockId);

    const statsDiv = document.createElement('div');
    const blockCount = countTotalBlocks(blockId, allBlocks);
    statsDiv.textContent = `📊 共包含 ${blockCount} 个块`;
    statsDiv.style.cssText = `
      padding: 8px 16px;
      color: var(--orca-color-text-3, #666);
      font-size: 12px;
      border: 1px solid var(--orca-color-border, #ccc);
      border-radius: 4px;
      background: var(--orca-color-bg-1, white);
    `;

    controls.appendChild(refreshBtn);
    controls.appendChild(statsDiv);

    container.appendChild(title);
    container.appendChild(content);
    container.appendChild(controls);

    // 关闭已存在的面板
    if (mindMapPanels.has(blockId)) {
      orca.nav.closePanel(mindMapPanels.get(blockId));
    }

    // 创建新面板
    const panelId = await orca.nav.addPanel(`mindmap-${blockId}`, {
      title: '思维导图',
      view: 'custom',
      component: () => container,
      position: 'right',
      width: '45%'
    });

    mindMapPanels.set(blockId, panelId);
    orca.notify('success', `思维导图已生成，共 ${blockCount} 个节点`);

  } catch (error) {
    console.error('创建思维导图失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `生成失败: ${errorMsg}`);
  }
}

// 统计块数量
function countTotalBlocks(blockId: string, allBlocks: Record<string, any>): number {
  const block = allBlocks[blockId];
  if (!block) return 0;
  
  let count = 1;
  if (block.children) {
    for (const childId of block.children) {
      count += countTotalBlocks(childId, allBlocks);
    }
  }
  return count;
}

// 右键菜单处理
function handleContextMenu(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const blockEl = target.closest('.orca-block') as HTMLElement;
  
  if (!blockEl) return;
  
  const blockId = blockEl.dataset.id;
  if (!blockId) return;

  // 创建自定义右键菜单项
  setTimeout(() => {
    // 查找是否已有上下文菜单
    const existingMenu = document.querySelector('.orca-context-menu, .context-menu');
    if (existingMenu) {
      // 添加我们的菜单项
      const menuItem = document.createElement('div');
      menuItem.textContent = '🧠 生成思维导图';
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-top: 1px solid var(--orca-color-border, #e0e0e0);
        color: var(--orca-color-text-1, #333);
        font-size: 14px;
      `;
      
      menuItem.onmouseenter = () => {
        menuItem.style.background = 'var(--orca-color-bg-2, #f0f0f0)';
      };
      
      menuItem.onmouseleave = () => {
        menuItem.style.background = 'transparent';
      };
      
      menuItem.onclick = async (event) => {
        event.stopPropagation();
        await createSimpleMindMap(blockId);
        // 关闭上下文菜单
        if (existingMenu.parentNode) {
          existingMenu.parentNode.removeChild(existingMenu);
        }
      };
      
      existingMenu.appendChild(menuItem);
    }
  }, 10); // 延迟确保菜单已创建
}

// 插件加载函数
async function load(_name: string) {
  pluginName = _name;
  console.log(`Markmap插件 ${pluginName} 开始加载...`);

  // 注册命令
  orca.commands.registerCommand(
    `${pluginName}.createMindMap`,
    async () => {
      // 获取当前选中的块或第一个块
      const blocks = orca.state.blocks;
      const firstBlockId = Object.keys(blocks)[0];
      
      if (firstBlockId) {
        await createSimpleMindMap(firstBlockId);
      } else {
        orca.notify('warn', '当前没有可用的笔记块');
      }
    },
    '生成思维导图'
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

  // 监听右键菜单
  document.addEventListener('contextmenu', handleContextMenu);

  console.log(`Markmap插件 ${pluginName} 加载完成`);
  orca.notify('success', 'Markmap插件已启用 - 右键节点查看选项');
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
  document.removeEventListener('contextmenu', handleContextMenu);

  // 移除命令和UI
  orca.commands.unregisterCommand(`${pluginName}.createMindMap`);
  orca.toolbar.unregisterToolbarButton(`${pluginName}.button`);
  orca.commands.unregisterShortcut('Ctrl+Shift+M');

  console.log('Markmap插件卸载完成');
  orca.notify('info', 'Markmap插件已禁用');
}

export { load, unload };