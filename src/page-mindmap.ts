/**
 * 虎鲸笔记页面思维导图插件
 * 将整个页面转换为思维导图显示
 */

// 全局变量声明
declare const orca: any;

// 插件状态
let pluginName: string;
let isInMindMapMode = false;
let originalContent: HTMLElement | null = null;

// 获取页面根块
function getPageRootBlocks(): string[] {
  const allBlocks = orca.state.blocks;
  if (!allBlocks) return [];
  
  // 找到所有根级块（没有父块的块）
  return Object.keys(allBlocks).filter(id => {
    const block = allBlocks[id];
    return !block.parent || !allBlocks[block.parent];
  });
}

// 生成页面思维导图HTML
function generatePageMindMapHTML(): string {
  const allBlocks = orca.state.blocks;
  const rootBlocks = getPageRootBlocks();
  
  if (rootBlocks.length === 0) {
    return `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: var(--orca-font-family, sans-serif);
        color: var(--orca-color-text-2, #666);
      ">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
          <div style="font-size: 18px;">页面内容为空</div>
        </div>
      </div>
    `;
  }

  function renderNode(nodeId: string, level: number = 0): string {
    const node = allBlocks[nodeId];
    if (!node) return '';
    
    const indent = level * 32;
    const fontSize = Math.max(14, 20 - level * 2);
    const bullets = ['🔵', '⚪', '🔸', '🔹', '▫️'];
    const bullet = bullets[Math.min(level, bullets.length - 1)];
    const content = (node.text || '无标题').substring(0, 200);
    
    // 根据层级设置颜色和字重
    const getNodeStyle = (level: number) => {
      if (level === 0) {
        return {
          color: 'var(--orca-color-primary, #2563eb)',
          fontWeight: '700',
          fontSize: '24px'
        };
      } else if (level === 1) {
        return {
          color: 'var(--orca-color-text-1, #1f2937)',
          fontWeight: '600',
          fontSize: '20px'
        };
      } else if (level === 2) {
        return {
          color: 'var(--orca-color-text-1, #374151)',
          fontWeight: '500',
          fontSize: '18px'
        };
      } else {
        return {
          color: 'var(--orca-color-text-2, #6b7280)',
          fontWeight: '400',
          fontSize: '16px'
        };
      }
    };
    
    const nodeStyle = getNodeStyle(level);
    
    let html = `
      <div style="
        margin: ${level === 0 ? '20px' : '12px'} 0;
        padding-left: ${indent}px;
        line-height: 1.6;
        ${level === 0 ? 'border-left: 4px solid var(--orca-color-primary, #2563eb); padding-left: ' + (indent + 16) + 'px;' : ''}
      ">
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 12px;
        ">
          <span style="
            font-size: ${fontSize}px;
            margin-top: 2px;
            flex-shrink: 0;
          ">${bullet}</span>
          <span style="
            color: ${nodeStyle.color};
            font-weight: ${nodeStyle.fontWeight};
            font-size: ${nodeStyle.fontSize};
            line-height: 1.5;
          ">${content}</span>
        </div>
      </div>
    `;
    
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        html += renderNode(childId, level + 1);
      }
    }
    
    return html;
  }

  const totalBlocks = Object.keys(allBlocks).length;
  let mindMapHTML = '';
  
  // 渲染所有根块
  for (const rootId of rootBlocks) {
    mindMapHTML += renderNode(rootId);
  }

  return `
    <div style="
      font-family: var(--orca-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      background: var(--orca-color-bg-1, #ffffff);
      color: var(--orca-color-text-1, #1f2937);
      min-height: 100vh;
      padding: 40px;
      transition: all 0.3s ease;
    ">
      <div style="
        max-width: 1200px;
        margin: 0 auto;
      ">
        <div style="
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--orca-color-border, #e5e7eb);
        ">
          <h1 style="
            margin: 0 0 12px 0;
            font-size: 32px;
            font-weight: 700;
            color: var(--orca-color-primary, #2563eb);
          ">🧠 页面思维导图</h1>
          <div style="
            display: flex;
            justify-content: center;
            gap: 24px;
            font-size: 14px;
            color: var(--orca-color-text-2, #6b7280);
          ">
            <span>📊 ${totalBlocks} 个节点</span>
            <span>🌳 ${rootBlocks.length} 个根节点</span>
            <span>🕒 ${new Date().toLocaleString()}</span>
          </div>
        </div>
        
        <div style="
          background: var(--orca-color-bg-2, #f9fafb);
          border: 1px solid var(--orca-color-border, #e5e7eb);
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        ">
          ${mindMapHTML}
        </div>
        
        <div style="
          text-align: center;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid var(--orca-color-border, #e5e7eb);
          color: var(--orca-color-text-3, #9ca3af);
          font-size: 12px;
        ">
          💡 提示：点击右上角按钮返回正常视图
        </div>
      </div>
    </div>
  `;
}

// 切换到思维导图模式
function switchToMindMapMode() {
  if (isInMindMapMode) return;
  
  try {
    // 保存原始内容
    const mainContent = document.querySelector('.orca-main-content, .main-content, main') as HTMLElement;
    if (!mainContent) {
      orca.notify('error', '找不到主内容区域');
      return;
    }
    
    originalContent = mainContent.cloneNode(true) as HTMLElement;
    
    // 生成思维导图
    const mindMapHTML = generatePageMindMapHTML();
    
    // 替换内容
    mainContent.innerHTML = mindMapHTML;
    
    isInMindMapMode = true;
    
    // 更新按钮状态
    updateToggleButton();
    
    const totalBlocks = Object.keys(orca.state.blocks || {}).length;
    orca.notify('success', `已切换到思维导图模式 - ${totalBlocks} 个节点`);
    
  } catch (error) {
    console.error('切换到思维导图模式失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `切换失败: ${errorMsg}`);
  }
}

// 切换回正常模式
function switchToNormalMode() {
  if (!isInMindMapMode || !originalContent) return;
  
  try {
    const mainContent = document.querySelector('.orca-main-content, .main-content, main') as HTMLElement;
    if (!mainContent) {
      orca.notify('error', '找不到主内容区域');
      return;
    }
    
    // 恢复原始内容
    mainContent.innerHTML = originalContent.innerHTML;
    
    isInMindMapMode = false;
    originalContent = null;
    
    // 更新按钮状态
    updateToggleButton();
    
    orca.notify('success', '已切换回正常视图');
    
  } catch (error) {
    console.error('切换回正常模式失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `切换失败: ${errorMsg}`);
  }
}

// 切换模式
function toggleMindMapMode() {
  if (isInMindMapMode) {
    switchToNormalMode();
  } else {
    switchToMindMapMode();
  }
}

// 更新切换按钮状态
function updateToggleButton() {
  const button = document.querySelector(`[data-plugin-button="${pluginName}.toggle"]`) as HTMLElement;
  if (button) {
    if (isInMindMapMode) {
      button.style.background = 'var(--orca-color-primary, #2563eb)';
      button.style.color = 'white';
      button.title = '切换回正常视图';
    } else {
      button.style.background = '';
      button.style.color = '';
      button.title = '切换到思维导图模式';
    }
  }
}

// 插件加载函数
async function load(_name: string) {
  pluginName = _name;
  console.log(`页面思维导图插件 ${pluginName} 开始加载...`);

  // 注册切换命令
  orca.commands.registerCommand(
    `${pluginName}.toggle`,
    toggleMindMapMode,
    '切换思维导图模式'
  );

  // 添加右上角切换按钮
  orca.toolbar.registerToolbarButton(`${pluginName}.toggle`, {
    icon: 'ti ti-brain',
    tooltip: '切换思维导图模式',
    command: `${pluginName}.toggle`,
    position: 'right'
  });

  // 注册快捷键
  orca.commands.registerShortcut(
    'Ctrl+Shift+M',
    `${pluginName}.toggle`
  );

  console.log(`页面思维导图插件 ${pluginName} 加载完成`);
  orca.notify('success', '页面思维导图插件已启用 - 点击右上角🧠按钮');
}

// 插件卸载函数
async function unload() {
  console.log('页面思维导图插件开始卸载...');

  // 如果在思维导图模式，先切换回正常模式
  if (isInMindMapMode) {
    switchToNormalMode();
  }

  // 移除命令和UI
  orca.commands.unregisterCommand(`${pluginName}.toggle`);
  orca.toolbar.unregisterToolbarButton(`${pluginName}.toggle`);
  orca.commands.unregisterShortcut('Ctrl+Shift+M');

  // 重置状态
  isInMindMapMode = false;
  originalContent = null;

  console.log('页面思维导图插件卸载完成');
  orca.notify('info', '页面思维导图插件已禁用');
}

export { load, unload };