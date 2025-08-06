/**
 * 虎鲸笔记大纲插件 - 基础版
 * 只使用确定可用的API，避免未知API调用
 */

// 全局变量声明
declare const orca: any;

// 插件状态
let pluginName: string;

// 生成大纲HTML
function generateOutlineHTML(blockId: string): string {
  const allBlocks = orca.state.blocks;
  const block = allBlocks[blockId];
  
  if (!block) {
    return '<div style="padding: 20px; color: red;">未找到指定块</div>';
  }

  function renderNode(nodeId: string, level: number = 0): string {
    const node = allBlocks[nodeId];
    if (!node) return '';
    
    const indent = level * 24;
    const fontSize = Math.max(12, 16 - level * 2);
    const bullet = ['●', '○', '▪', '▫', '‣'][Math.min(level, 4)];
    const content = (node.text || '未命名').substring(0, 150);
    const textColor = level === 0 ? '#2563eb' : level === 1 ? '#374151' : '#6b7280';
    
    let html = `<div style="
      margin: ${level === 0 ? '12px' : '6px'} 0; 
      padding-left: ${indent}px; 
      font-size: ${fontSize}px; 
      line-height: 1.5;
      font-weight: ${level === 0 ? '600' : level === 1 ? '500' : 'normal'};
    ">
      <span style="color: #2563eb; margin-right: 8px;">${bullet}</span>
      <span style="color: ${textColor};">${content}</span>
    </div>`;
    
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        html += renderNode(childId, level + 1);
      }
    }
    
    return html;
  }

  const blockCount = countBlocks(blockId, allBlocks);
  
  return `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    ">
      <h2 style="
        margin: 0 0 24px 0;
        color: #1f2937;
        font-size: 24px;
        border-bottom: 3px solid #2563eb;
        padding-bottom: 12px;
      ">
        🧠 ${(block.text || '思维导图').substring(0, 60)}
      </h2>
      
      <div style="
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 20px;
        margin-bottom: 16px;
        max-height: 500px;
        overflow-y: auto;
      ">
        ${renderNode(blockId)}
      </div>
      
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        color: #6b7280;
        border-top: 1px solid #e2e8f0;
        padding-top: 12px;
      ">
        <span>📊 包含 ${blockCount} 个节点</span>
        <span>🕒 ${new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  `;
}

// 统计块数量
function countBlocks(blockId: string, allBlocks: Record<string, any>): number {
  const block = allBlocks[blockId];
  if (!block) return 0;
  
  let count = 1;
  if (block.children) {
    for (const childId of block.children) {
      count += countBlocks(childId, allBlocks);
    }
  }
  return count;
}

// 在新窗口中显示大纲
function showOutlineInNewWindow(blockId: string) {
  try {
    const outlineHTML = generateOutlineHTML(blockId);
    
    const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    
    if (!newWindow) {
      orca.notify('error', '无法打开新窗口，请检查浏览器弹窗设置');
      return;
    }

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>思维导图 - 虎鲸笔记</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: #f1f5f9;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }
          </style>
        </head>
        <body>
          ${outlineHTML}
        </body>
      </html>
    `);
    
    newWindow.document.close();
    
    const allBlocks = orca.state.blocks;
    const block = allBlocks[blockId];
    const blockCount = countBlocks(blockId, allBlocks);
    
    orca.notify('success', `思维导图已在新窗口打开 - ${blockCount} 个节点`);
    
  } catch (error) {
    console.error('显示大纲失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `生成失败: ${errorMsg}`);
  }
}

// 在对话框中显示大纲
function showOutlineDialog(blockId: string) {
  try {
    const outlineHTML = generateOutlineHTML(blockId);
    
    // 创建模态对话框
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 16px;
      z-index: 1;
    `;
    
    closeButton.onclick = () => {
      document.body.removeChild(overlay);
    };
    
    dialog.innerHTML = outlineHTML;
    dialog.appendChild(closeButton);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // 点击遮罩关闭
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };
    
    const allBlocks = orca.state.blocks;
    const blockCount = countBlocks(blockId, allBlocks);
    orca.notify('success', `思维导图已生成 - ${blockCount} 个节点`);
    
  } catch (error) {
    console.error('显示大纲失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `生成失败: ${errorMsg}`);
  }
}

// 插件加载函数
async function load(_name: string) {
  pluginName = _name;
  console.log(`大纲插件 ${pluginName} 开始加载...`);

  // 注册命令 - 新窗口显示
  orca.commands.registerCommand(
    `${pluginName}.showInWindow`,
    () => {
      const blocks = orca.state.blocks;
      const firstBlockId = Object.keys(blocks)[0];
      
      if (firstBlockId) {
        showOutlineInNewWindow(firstBlockId);
      } else {
        orca.notify('warn', '当前没有可用的笔记块');
      }
    },
    '在新窗口显示思维导图'
  );

  // 注册命令 - 对话框显示
  orca.commands.registerCommand(
    `${pluginName}.showDialog`,
    () => {
      const blocks = orca.state.blocks;
      const firstBlockId = Object.keys(blocks)[0];
      
      if (firstBlockId) {
        showOutlineDialog(firstBlockId);
      } else {
        orca.notify('warn', '当前没有可用的笔记块');
      }
    },
    '显示思维导图'
  );

  // 添加工具栏按钮
  orca.toolbar.registerToolbarButton(`${pluginName}.button`, {
    icon: 'ti ti-brain',
    tooltip: '生成思维导图',
    command: `${pluginName}.showDialog`
  });

  // 注册快捷键
  orca.commands.registerShortcut(
    'Ctrl+Shift+M',
    `${pluginName}.showDialog`
  );

  console.log(`大纲插件 ${pluginName} 加载完成`);
  orca.notify('success', '思维导图插件已启用');
}

// 插件卸载函数
async function unload() {
  console.log('大纲插件开始卸载...');

  // 移除命令和UI
  orca.commands.unregisterCommand(`${pluginName}.showInWindow`);
  orca.commands.unregisterCommand(`${pluginName}.showDialog`);
  orca.toolbar.unregisterToolbarButton(`${pluginName}.button`);
  orca.commands.unregisterShortcut('Ctrl+Shift+M');

  console.log('大纲插件卸载完成');
  orca.notify('info', '思维导图插件已禁用');
}

export { load, unload };