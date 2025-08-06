/**
 * 虎鲸笔记页面思维导图插件 - 本地Markmap库版本
 * 参照Logseq插件实现，使用本地安装的markmap包
 */

// 导入本地安装的Markmap库
import { Transformer } from 'markmap-lib';
import { Markmap, deriveOptions } from 'markmap-view';

// 全局变量声明
declare const orca: any;

// 插件状态
let pluginName: string;
let isInMindMapMode = false;
let toggleButton: HTMLElement | null = null;
let currentMarkmap: any = null;

// 从DOM中提取页面数据结构
function extractPageStructure(): any[] {
  const mainEditor = document.querySelector('.orca-block-editor-blocks');
  if (!mainEditor) {
    console.warn('[调试] 找不到主编辑器区域');
    return [];
  }
  
  const blocks = mainEditor.querySelectorAll('.orca-container.orca-block');
  console.log('[调试] 找到块数量:', blocks.length);
  
  const structure: any[] = [];
  
  blocks.forEach((block, index) => {
    const blockElement = block as HTMLElement;
    const dataId = blockElement.dataset.id;
    const indent = parseInt(blockElement.dataset.indent || '0');
    const type = blockElement.dataset.type || 'text';
    
    // 跳过表格相关内容 - 更全面的检测
    if (blockElement.querySelector('table') || 
        blockElement.querySelector('.orca-table') ||
        blockElement.querySelector('thead') ||
        blockElement.querySelector('tbody') ||
        blockElement.querySelector('tr') ||
        blockElement.querySelector('td') ||
        blockElement.querySelector('th') ||
        blockElement.closest('table') ||
        blockElement.closest('.orca-table') ||
        blockElement.closest('tr') ||
        type === 'table' ||
        blockElement.className.includes('table')) {
      console.log(`[调试] 跳过表格块${index}: ID=${dataId}, 类型=${type}, 类名=${blockElement.className}`);
      return;
    }
    
    // 提取文本内容
    let content = '';
    const contentElement = blockElement.querySelector('.orca-repr-main-content');
    if (contentElement) {
      const textElements = contentElement.querySelectorAll('.orca-inline, .orca-repr-title, h1, h2, h3, h4, h5, h6');
      if (textElements.length > 0) {
        content = Array.from(textElements).map(el => el.textContent || '').join(' ').trim();
      } else {
        content = contentElement.textContent || '';
      }
    }
    
    console.log(`[调试] 块${index}: ID=${dataId}, 层级=${indent}, 类型=${type}, 内容="${content}"`);
    
    if (content.trim()) {
      structure.push({
        id: dataId || `block-${Date.now()}-${Math.random()}`,
        content: content.substring(0, 200),
        level: indent,
        type: type,
        element: blockElement
      });
    }
  });
  
  console.log('[调试] 提取到的结构:', structure);
  return structure;
}

// 将块结构转换为Markdown
function blocksToMarkdown(blocks: any[]): string {
  console.log('[调试] 开始转换块为Markdown，块数量:', blocks.length);
  
  if (blocks.length === 0) {
    console.log('[调试] 无内容，返回默认标题');
    return '# 页面内容为空';
  }
  
  let markdown = '';
  
  for (const block of blocks) {
    const indent = '#'.repeat(Math.min(block.level + 1, 6));
    let content = block.content.trim();
    
    // 处理长文本，添加换行
    if (content.length > 50) {
      content = content.replace(/(.{50})/g, '$1\n').replace(/\n\s+/g, '\n');
    }
    
    if (content) {
      const line = `${indent} ${content}\n\n`;
      markdown += line;
      console.log(`[调试] 添加行: ${line.trim()}`);
    }
  }
  
  const result = markdown.trim();
  console.log('[调试] 最终Markdown:', result);
  return result;
}

// 创建思维导图容器HTML
function createMindMapContainer(): string {
  const containerId = `markmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 检测当前主题 - 添加详细调试信息
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const rootBg = window.getComputedStyle(document.documentElement).backgroundColor;
  const bodyClasses = document.body.className;
  const rootClasses = document.documentElement.className;
  const orcaBg1 = getComputedStyle(document.body).getPropertyValue('--orca-color-bg-1');
  
  console.log('[主题调试] body背景:', bodyBg);
  console.log('[主题调试] root背景:', rootBg);
  console.log('[主题调试] body类名:', bodyClasses);
  console.log('[主题调试] root类名:', rootClasses);
  console.log('[主题调试] --orca-color-bg-1:', orcaBg1);
  
  const isDarkTheme = document.documentElement.classList.contains('dark') || 
                     document.body.classList.contains('dark') ||
                     document.documentElement.classList.contains('theme-dark') ||
                     bodyBg.includes('33, 37, 41') ||  // Bootstrap深色背景
                     bodyBg.includes('rgb(33, 37, 41)') ||
                     bodyBg.includes('40, 40, 40') ||   // 常见深色背景
                     bodyBg.includes('38, 38, 38') ||   // 虎鲸笔记深色背景
                     bodyBg.includes('rgb(38, 38, 38)') ||
                     rootBg.includes('33, 37, 41') ||
                     orcaBg1.includes('dark') ||
                     orcaBg1.includes('15%') ||         // 虎鲸笔记深色主题变量
                     orcaBg1.includes('hsl(0 0% 15%)');
  
  console.log('[主题调试] 检测结果 isDarkTheme:', isDarkTheme);
  
  const bgColor = isDarkTheme ? '#2c2c2c' : '#ffffff';
  const textColor = isDarkTheme ? 'white' : '#333333';
  const circleStroke = isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
  
  return `
    <style>
      /* 隐藏顶部导航栏 */
      .orca-headbar, .orca-header, .page-header {
        display: none !important;
      }
      
      .${containerId} text {
        fill: ${textColor} !important;
        font-size: 14px !important;
        font-family: var(--orca-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif) !important;
        font-weight: 500 !important;
        stroke: none !important;
      }
      .${containerId} .markmap-node {
        cursor: pointer;
      }
      .${containerId} .markmap-link {
        fill: none;
        stroke-width: 2;
        opacity: 0.8;
      }
      .${containerId} circle {
        stroke: ${circleStroke} !important;
        stroke-width: 1 !important;
      }
      /* 文本换行处理 */
      .${containerId} foreignObject {
        overflow: visible;
      }
    </style>
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: ${bgColor};
      overflow: hidden;
      font-family: var(--orca-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      z-index: 10000;
    ">
      <svg id="${containerId}" class="${containerId}" style="width: 100%; height: 100%;"></svg>
      
      <!-- 控制按钮面板 -->
      <div id="markmap-controls-${containerId}" style="
        position: absolute;
        bottom: 20px;
        left: 20px;
        display: flex;
        gap: 8px;
        z-index: 10001;
      ">
        <button id="zoom-in-${containerId}" style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        ">+</button>
        
        <button id="zoom-out-${containerId}" style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        ">-</button>
        
        <button id="close-${containerId}" style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(220, 53, 69, 0.8);
          color: white;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        ">✕</button>
      </div>
      
      <div id="loading-${containerId}" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #666;
        font-size: 16px;
        display: none;
      ">初始化思维导图中...</div>
    </div>
  `;
}

// 初始化Markmap
function initializeMarkmap(containerId: string, markdown: string) {
  try {
    console.log('[调试] 开始初始化Markmap，容器ID:', containerId);
    console.log('[调试] 输入的Markdown:', markdown);
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[调试] 找不到Markmap容器:', containerId);
      return;
    }
    
    console.log('[调试] 找到容器:', container);

    // 使用Transformer转换Markdown
    const transformer = new Transformer();
    console.log('[调试] 创建Transformer成功');
    
    const { root, features } = transformer.transform(markdown);
    console.log('[调试] Transformer转换结果 - root:', root);
    console.log('[调试] Transformer转换结果 - features:', features);
    
    // 创建Markmap实例，配置文本换行
    const options = {
      maxWidth: 200,  // 设置最大宽度，超过会换行
      spacingVertical: 10,
      spacingHorizontal: 80,
      paddingX: 8,
      autoFit: true,
      pan: true,
      zoom: true
    };
    
    currentMarkmap = Markmap.create(container as any, options, root);
    console.log('[调试] Markmap实例创建成功:', currentMarkmap);
    
    // 添加按钮事件监听器
    const zoomInBtn = document.getElementById(`zoom-in-${containerId}`);
    const zoomOutBtn = document.getElementById(`zoom-out-${containerId}`);
    const closeBtn = document.getElementById(`close-${containerId}`);
    
    if (zoomInBtn) {
      zoomInBtn.onclick = () => {
        if (currentMarkmap) {
          currentMarkmap.rescale(1.5);
          console.log('[调试] 放大');
        }
      };
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.onclick = () => {
        if (currentMarkmap) {
          currentMarkmap.rescale(0.75);
          console.log('[调试] 缩小');
        }
      };
    }
    
    if (closeBtn) {
      closeBtn.onclick = () => {
        console.log('[调试] 关闭按钮点击');
        switchToEditMode();
      };
    }
    
    // 添加ESC键退出 - 使用更安全的事件处理方式
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isInMindMapMode) {
        console.log('[调试] ESC键被按下，准备退出思维导图模式');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // 阻止所有后续处理
        switchToEditMode();
        return false;
      }
    };
    
    // 清理之前的监听器（如果有）
    if ((window as any).markmapEscHandler) {
      document.removeEventListener('keydown', (window as any).markmapEscHandler, true);
      document.removeEventListener('keydown', (window as any).markmapEscHandler, false);
      (window as any).markmapEscHandler = null;
    }
    
    // 使用捕获阶段，确保优先处理
    document.addEventListener('keydown', escHandler, true);
    
    // 保存到全局变量以便清理
    (window as any).markmapEscHandler = escHandler;
    
    // 添加Ctrl + 滚轮缩放支持（只支持Ctrl键，不支持Cmd键）
    const wheelZoomHandler = (e: WheelEvent) => {
      if (isInMindMapMode && e.ctrlKey && !e.metaKey) { // 只检测Ctrl键，排除Cmd键
        e.preventDefault();
        e.stopPropagation();
        
        if (currentMarkmap) {
          const delta = e.deltaY > 0 ? 0.9 : 1.1; // 向下滚轮缩小，向上滚轮放大
          currentMarkmap.rescale(delta);
          console.log('[调试] Ctrl+滚轮缩放:', delta > 1 ? '放大' : '缩小');
        }
      }
    };
    
    // 为整个覆盖层添加滚轮事件监听
    const overlay = document.getElementById('mindmap-overlay');
    if (overlay) {
      overlay.addEventListener('wheel', wheelZoomHandler, { passive: false });
      // 保存处理器以便后续清理
      (window as any).markmapWheelHandler = wheelZoomHandler;
      (window as any).markmapOverlay = overlay;
    }
    
    // 适应视图
    setTimeout(() => {
      if (currentMarkmap) {
        currentMarkmap.fit();
        console.log('[调试] Markmap fit完成');
        
        // 检查SVG内容
        const svgElements = container.querySelectorAll('text');
        console.log('[调试] SVG中的文本元素数量:', svgElements.length);
        svgElements.forEach((text, i) => {
          console.log(`[调试] 文本元素${i}:`, text.textContent, '样式:', window.getComputedStyle(text));
        });
      }
    }, 500);
    
    console.log('[调试] Markmap 初始化成功');
    
  } catch (error) {
    console.error('[调试] Markmap 初始化失败:', error);
    const container = document.getElementById(containerId);
    if (container) {
      (container.parentElement as HTMLElement).innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: #ef4444;
          font-size: 16px;
          text-align: center;
        ">
          <div>
            <div>思维导图初始化失败</div>
            <div style="font-size: 14px; color: #666; margin-top: 10px;">
              错误: ${error instanceof Error ? error.message : '未知错误'}
            </div>
          </div>
        </div>
      `;
    }
  }
}

// 创建切换按钮
function createToggleButton(): HTMLElement {
  const button = document.createElement('button');
  button.className = 'orca-button plain';
  button.innerHTML = '<i class="ti ti-brain orca-headbar-icon"></i>';
  button.title = '切换思维导图模式';
  button.style.cssText = `
    transition: all 0.2s ease;
    border-radius: 4px;
  `;
  
  button.onclick = () => toggleMindMapMode();
  
  // 悬停效果
  button.onmouseenter = () => {
    if (!isInMindMapMode) {
      button.style.background = 'var(--orca-color-bg-2, #f0f0f0)';
    }
  };
  
  button.onmouseleave = () => {
    if (!isInMindMapMode) {
      button.style.background = '';
    }
  };
  
  return button;
}

// 更新按钮状态
function updateButtonState() {
  if (!toggleButton) return;
  
  if (isInMindMapMode) {
    toggleButton.style.background = 'var(--orca-color-primary, #2563eb)';
    toggleButton.style.color = 'white';
    toggleButton.title = '返回编辑模式';
    const icon = toggleButton.querySelector('i');
    if (icon) {
      icon.style.color = 'white';
    }
  } else {
    toggleButton.style.background = '';
    toggleButton.style.color = '';
    toggleButton.title = '切换思维导图模式';
    const icon = toggleButton.querySelector('i');
    if (icon) {
      icon.style.color = '';
    }
  }
}

// 切换到思维导图模式 - 使用覆盖层而不是替换DOM
function switchToMindMapMode() {
  if (isInMindMapMode) return;
  
  try {
    const mainEditor = document.querySelector('.orca-block-editor-blocks') as HTMLElement;
    if (!mainEditor) {
      orca.notify('error', '找不到主编辑区域');
      return;
    }
    
    // 提取页面结构
    const blocks = extractPageStructure();
    
    if (blocks.length === 0) {
      orca.notify('warn', '当前页面没有可显示的内容');
      return;
    }
    
    // 转换为Markdown
    const markdown = blocksToMarkdown(blocks);
    
    // 创建思维导图容器 - 作为覆盖层，不替换原始内容
    const containerHTML = createMindMapContainer();
    
    // 隐藏原始编辑器内容，而不是替换
    mainEditor.style.display = 'none';
    
    // 创建覆盖层
    const overlay = document.createElement('div');
    overlay.id = 'mindmap-overlay';
    overlay.innerHTML = containerHTML;
    
    // 将覆盖层添加到编辑器的父容器中
    const parentContainer = mainEditor.parentElement;
    if (parentContainer) {
      parentContainer.appendChild(overlay);
    } else {
      document.body.appendChild(overlay);
    }
    
    console.log('[调试] 创建思维导图覆盖层，原始编辑器被隐藏但未删除');
    
    // 获取容器ID并初始化Markmap
    const svgElement = overlay.querySelector('svg');
    if (svgElement) {
      const containerId = svgElement.id;
      setTimeout(() => {
        initializeMarkmap(containerId, markdown);
      }, 100);
    }
    
    isInMindMapMode = true;
    updateButtonState();
    
    orca.notify('success', `已切换到思维导图模式 - ${blocks.length} 个节点`);
    
  } catch (error) {
    console.error('切换到思维导图模式失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `切换失败: ${errorMsg}`);
  }
}

// 切换回编辑模式 - 使用覆盖层移除方式，保护原始DOM
function switchToEditMode() {
  if (!isInMindMapMode) return;
  
  try {
    const mainEditor = document.querySelector('.orca-block-editor-blocks') as HTMLElement;
    if (!mainEditor) {
      orca.notify('error', '找不到主编辑区域');
      return;
    }
    
    // 清理ESC键监听器 - 增强清理机制
    if ((window as any).markmapEscHandler) {
      document.removeEventListener('keydown', (window as any).markmapEscHandler, true);
      document.removeEventListener('keydown', (window as any).markmapEscHandler, false);
      (window as any).markmapEscHandler = null;
      console.log('[调试] ESC键监听器已清理');
    }
    
    // 清理滚轮缩放事件监听器
    if ((window as any).markmapWheelHandler && (window as any).markmapOverlay) {
      (window as any).markmapOverlay.removeEventListener('wheel', (window as any).markmapWheelHandler);
      (window as any).markmapWheelHandler = null;
      (window as any).markmapOverlay = null;
      console.log('[调试] 滚轮缩放监听器已清理');
    }
    
    // 额外清理：移除所有可能劫持的键盘事件监听器
    try {
      // 清理可能的全局键盘事件劫持
      const allKeydownListeners = document.querySelectorAll('*');
      allKeydownListeners.forEach((element) => {
        // 克隆节点以移除所有事件监听器，然后替换
        if (element.tagName === 'SVG' && element.id && element.id.startsWith('markmap-')) {
          // 对于 Markmap SVG 元素，直接移除所有事件
          const clonedElement = element.cloneNode(true);
          element.parentNode?.replaceChild(clonedElement, element);
        }
      });
      
      // 强制清理可能的全局事件劫持
      if ((window as any).d3) {
        (window as any).d3.selectAll('*').on('keydown', null);
        (window as any).d3.selectAll('*').on('keyup', null);
        (window as any).d3.selectAll('*').on('keypress', null);
      }
      
      console.log('[调试] 额外键盘事件清理完成');
    } catch (e) {
      console.warn('[调试] 额外清理时出错:', e);
    }
    
    // 清理Markmap实例和所有相关事件监听器
    if (currentMarkmap) {
      try {
        // 清理Markmap的所有事件监听器
        if (currentMarkmap.svg) {
          currentMarkmap.svg.selectAll('*').on('.zoom', null);
          currentMarkmap.svg.selectAll('*').on('.drag', null);
          currentMarkmap.svg.selectAll('*').on('click', null);
          currentMarkmap.svg.selectAll('*').on('dblclick', null);
        }
        
        // 清理缩放和拖拽行为
        if (currentMarkmap.zoom) {
          currentMarkmap.svg.call(currentMarkmap.zoom.on('zoom', null));
        }
        
        // 销毁实例
        currentMarkmap.destroy?.();
        
      } catch (e) {
        console.warn('清理Markmap实例时出错:', e);
      }
      currentMarkmap = null;
    }
    
    // 查找并移除覆盖层
    const overlay = document.getElementById('mindmap-overlay');
    if (overlay) {
      overlay.remove();
      console.log('[调试] 覆盖层已移除');
    }
    
    // 恢复原始编辑器显示
    mainEditor.style.display = '';
    console.log('[调试] 恢复原始编辑器显示');
    
    // 强制重新激活编辑器的所有功能
    setTimeout(() => {
      try {
        // 方法1: 触发虎鲸笔记的重新初始化（如果API存在）
        if (orca && orca.editor && typeof orca.editor.init === 'function') {
          orca.editor.init();
          console.log('[调试] 虎鲸编辑器重新初始化');
        }
        
        // 方法2: 重新聚焦编辑器
        const firstEditableElement = mainEditor.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"]') as HTMLElement;
        if (firstEditableElement) {
          firstEditableElement.focus();
          firstEditableElement.blur();
          setTimeout(() => firstEditableElement.focus(), 50);
        } else {
          mainEditor.focus();
          mainEditor.blur();
          setTimeout(() => mainEditor.focus(), 50);
        }
        
        // 方法3: 触发模拟输入事件来重新激活键盘处理
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        const keydownEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: '' });
        mainEditor.dispatchEvent(inputEvent);
        mainEditor.dispatchEvent(keydownEvent);
        
        // 方法4: 强制刷新编辑器状态
        if (orca && orca.editor && typeof orca.editor.refresh === 'function') {
          orca.editor.refresh();
          console.log('[调试] 虎鲸编辑器刷新');
        }
        
        // 方法5: 重新绑定键盘事件（如果API存在）
        if (orca && orca.editor && typeof orca.editor.bindEvents === 'function') {
          orca.editor.bindEvents();
          console.log('[调试] 虎鲸编辑器重新绑定事件');
        }
        
        console.log('[调试] 编辑器完全重新激活完成');
      } catch (e) {
        console.warn('编辑器重新激活失败:', e);
      }
    }, 200);
    
    // 额外延迟再次确认聚焦
    setTimeout(() => {
      try {
        const activeElement = document.activeElement;
        if (!mainEditor.contains(activeElement)) {
          const firstEditableElement = mainEditor.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"]') as HTMLElement;
          if (firstEditableElement) {
            firstEditableElement.focus();
          }
          console.log('[调试] 二次聚焦确认完成');
        }
      } catch (e) {
        console.warn('二次聚焦失败:', e);
      }
    }, 500);
    
    isInMindMapMode = false;
    updateButtonState();
    
    orca.notify('success', '已返回编辑模式');
    
  } catch (error) {
    console.error('切换回编辑模式失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `切换失败: ${errorMsg}`);
  }
}

// 切换模式
function toggleMindMapMode() {
  if (isInMindMapMode) {
    switchToEditMode();
  } else {
    switchToMindMapMode();
  }
}

// 添加按钮到工具栏
function addButtonToToolbar() {
  const toolbar = document.querySelector('.orca-headbar-global-tools.orca-headbar-right');
  if (!toolbar) {
    console.warn('未找到工具栏，尝试延迟添加');
    setTimeout(addButtonToToolbar, 1000);
    return;
  }
  
  // 避免重复添加
  if (toggleButton && toggleButton.parentNode) {
    return;
  }
  
  toggleButton = createToggleButton();
  toolbar.insertBefore(toggleButton, toolbar.firstChild);
  
  console.log('思维导图按钮已添加到工具栏');
}

// 移除按钮
function removeButtonFromToolbar() {
  if (toggleButton && toggleButton.parentNode) {
    toggleButton.parentNode.removeChild(toggleButton);
    toggleButton = null;
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

  // 注册快捷键 - 如果API存在的话
  if (orca.commands && typeof orca.commands.registerShortcut === 'function') {
    orca.commands.registerShortcut(
      'Ctrl+Shift+M',
      `${pluginName}.toggle`
    );
  }

  // 添加工具栏按钮
  addButtonToToolbar();

  console.log(`页面思维导图插件 ${pluginName} 加载完成`);
  // 移除启动通知，保持界面简洁
  // orca.notify('success', '思维导图插件已启用 - 右上角🧠按钮');
}

// 插件卸载函数
async function unload() {
  console.log('页面思维导图插件开始卸载...');

  // 如果在思维导图模式，先切换回编辑模式
  if (isInMindMapMode) {
    switchToEditMode();
  }

  // 强制清理所有事件监听器 - 增强版
  if ((window as any).markmapEscHandler) {
    document.removeEventListener('keydown', (window as any).markmapEscHandler, true);
    document.removeEventListener('keydown', (window as any).markmapEscHandler, false);
    (window as any).markmapEscHandler = null;
  }
  
  // 清理滚轮缩放事件监听器
  if ((window as any).markmapWheelHandler && (window as any).markmapOverlay) {
    (window as any).markmapOverlay.removeEventListener('wheel', (window as any).markmapWheelHandler);
    (window as any).markmapWheelHandler = null;
    (window as any).markmapOverlay = null;
  }
  
  // 额外清理可能残留的全局事件监听器
  try {
    // 清理可能的D3/Markmap全局事件
    if ((window as any).d3) {
      (window as any).d3.selectAll('*').on('keydown', null);
      (window as any).d3.selectAll('*').on('keyup', null);
      (window as any).d3.selectAll('*').on('keypress', null);
    }
    
    // 移除可能残留的覆盖层
    const overlay = document.getElementById('mindmap-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    console.log('[调试] 卸载时事件清理完成');
  } catch (e) {
    console.warn('卸载清理时出错:', e);
  }

  // 移除工具栏按钮
  removeButtonFromToolbar();

  // 移除命令
  if (orca.commands && typeof orca.commands.unregisterCommand === 'function') {
    orca.commands.unregisterCommand(`${pluginName}.toggle`);
  }
  if (orca.commands && typeof orca.commands.unregisterShortcut === 'function') {
    orca.commands.unregisterShortcut('Ctrl+Shift+M');
  }

  // 重置状态
  isInMindMapMode = false;
  currentMarkmap = null;

  console.log('页面思维导图插件卸载完成');
  orca.notify('info', '思维导图插件已禁用');
}

export { load, unload };