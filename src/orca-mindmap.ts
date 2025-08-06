/**
 * 虎鲸笔记页面思维导图插件 - 基于真实DOM结构
 * 根据实际的虎鲸笔记DOM结构进行开发
 */

// 不导入 Markmap 库，使用 CDN 动态加载

// 全局变量声明
declare const orca: any;

// 插件状态
let pluginName: string;
let isInMindMapMode = false;
let originalContent: string = '';
let toggleButton: HTMLElement | null = null;

// 从DOM中提取页面数据结构
function extractPageStructure(): any[] {
  const mainEditor = document.querySelector('.orca-block-editor-blocks');
  if (!mainEditor) return [];
  
  const blocks = mainEditor.querySelectorAll('.orca-container.orca-block');
  const structure: any[] = [];
  
  blocks.forEach((block) => {
    const blockElement = block as HTMLElement;
    const dataId = blockElement.dataset.id;
    const indent = parseInt(blockElement.dataset.indent || '0');
    const type = blockElement.dataset.type || 'text';
    
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
  
  return structure;
}

// 生成思维导图HTML - 使用真正的 Markmap 方案
function generateMindMapHTML(blocks: any[]): string {
  if (blocks.length === 0) {
    return `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: white;
        font-family: var(--orca-font-family, sans-serif);
        color: #666;
      ">
        <div>页面内容为空</div>
      </div>
    `;
  }

  // 将块转换为 Markdown 格式
  function blocksToMarkdown(blocks: any[]): string {
    let markdown = '';
    
    for (const block of blocks) {
      const indent = '#'.repeat(Math.min(block.level + 1, 6));
      const content = block.content.trim();
      if (content) {
        markdown += `${indent} ${content}\n\n`;
      }
    }
    
    return markdown.trim();
  }

  const markdown = blocksToMarkdown(blocks);
  const containerId = `markmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return `
    <div style="
      width: 100%;
      height: 100vh;
      background: white;
      overflow: hidden;
      font-family: var(--orca-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    ">
      <div id="${containerId}" style="width: 100%; height: 100%;"></div>
      <div id="loading-${containerId}" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #666;
        font-size: 16px;
      ">加载思维导图中...</div>
      
      <!-- 使用国内CDN加载库 -->
      <script src="https://lib.baomitu.com/d3/7.8.5/d3.min.js"></script>
      <script src="https://cdn.staticfile.org/markmap-lib/0.17.0/browser/index.min.js"></script>
      <script src="https://cdn.staticfile.org/markmap-view/0.17.0/browser/index.min.js"></script>
      
      <!-- 多个国内CDN备用方案 -->
      <script>
        let scriptLoadAttempts = 0;
        const maxLoadAttempts = 3;
        
        // CDN备选方案列表
        const cdnSources = [
          {
            name: '七牛云CDN',
            d3: 'https://cdn.staticfile.org/d3/7.8.5/d3.min.js',
            markmapLib: 'https://cdn.staticfile.org/markmap-lib/0.17.0/browser/index.min.js',
            markmapView: 'https://cdn.staticfile.org/markmap-view/0.17.0/browser/index.min.js'
          },
          {
            name: '360CDN',
            d3: 'https://lib.baomitu.com/d3/7.8.5/d3.min.js',
            markmapLib: 'https://lib.baomitu.com/markmap-lib/0.17.0/browser/index.min.js',
            markmapView: 'https://lib.baomitu.com/markmap-view/0.17.0/browser/index.min.js'
          },
          {
            name: 'unpkg镜像',
            d3: 'https://unpkg.com/d3@7/dist/d3.min.js',
            markmapLib: 'https://unpkg.com/markmap-lib@0.17.0/dist/browser/index.min.js',
            markmapView: 'https://unpkg.com/markmap-view@0.17.0/dist/browser/index.min.js'
          }
        ];
        
        function loadScriptsFromCDN(cdnIndex = 0) {
          if (cdnIndex >= cdnSources.length) {
            console.error('所有CDN源都失败了');
            return;
          }
          
          const cdn = cdnSources[cdnIndex];
          console.log(\`尝试从 \${cdn.name} 加载脚本...\`);
          
          const scripts = [cdn.d3, cdn.markmapLib, cdn.markmapView];
          let loadedCount = 0;
          let hasError = false;
          
          scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            
            script.onload = () => {
              loadedCount++;
              if (loadedCount === scripts.length && !hasError) {
                console.log(\`\${cdn.name} 加载完成\`);
                // 验证库是否正确加载
                setTimeout(() => {
                  if (typeof d3 === 'undefined' || typeof markmap === 'undefined') {
                    console.warn(\`\${cdn.name} 脚本加载但库未定义，尝试下一个CDN\`);
                    loadScriptsFromCDN(cdnIndex + 1);
                  }
                }, 100);
              }
            };
            
            script.onerror = () => {
              if (!hasError) {
                hasError = true;
                console.warn(\`\${cdn.name} 加载失败，尝试下一个CDN\`);
                setTimeout(() => loadScriptsFromCDN(cdnIndex + 1), 500);
              }
            };
            
            document.head.appendChild(script);
          });
          
          // 超时检测
          setTimeout(() => {
            if (loadedCount < scripts.length) {
              console.warn(\`\${cdn.name} 加载超时，尝试下一个CDN\`);
              if (!hasError) {
                hasError = true;
                loadScriptsFromCDN(cdnIndex + 1);
              }
            }
          }, 5000);
        }
        
        // 检测初始脚本是否加载成功
        setTimeout(() => {
          if (typeof d3 === 'undefined' || typeof markmap === 'undefined') {
            console.log('初始CDN加载失败，启动备用CDN方案...');
            loadScriptsFromCDN(0);
          }
        }, 2000);
      </script>
      
      <script>
        (function() {
          const containerId = '${containerId}';
          const markdown = \`${markdown.replace(/`/g, '\\`')}\`;
          
          // 等待所有脚本加载完成，增加超时处理
          let waitAttempts = 0;
          const maxWaitAttempts = 100; // 10秒超时
          
          function waitForMarkmap() {
            waitAttempts++;
            
            if (typeof d3 !== 'undefined' && typeof markmap !== 'undefined' && markmap.Transformer && markmap.Markmap) {
              console.log('所有脚本加载完成，开始初始化 Markmap');
              initializeMarkmap();
            } else if (waitAttempts >= maxWaitAttempts) {
              console.error('脚本加载超时');
              const container = document.getElementById(containerId);
              const loadingEl = document.getElementById('loading-' + containerId);
              if (loadingEl) loadingEl.style.display = 'none';
              if (container) {
                container.innerHTML = \`
                  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:16px;text-align:center;">
                    <div>网络连接问题，无法加载思维导图库</div>
                    <div style="font-size:14px;color:#666;margin-top:10px;">
                      检测到的状态：<br/>
                      D3: \${typeof d3 !== 'undefined' ? '✓' : '✗'}<br/>
                      Markmap: \${typeof markmap !== 'undefined' ? '✓' : '✗'}
                    </div>
                    <button onclick="location.reload()" style="margin-top:15px;padding:8px 16px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">
                      重试
                    </button>
                  </div>
                \`;
              }
            } else {
              setTimeout(waitForMarkmap, 100);
            }
          }
          
          function initializeMarkmap() {
            try {
              const loadingEl = document.getElementById('loading-' + containerId);
              if (loadingEl) loadingEl.style.display = 'none';
              
              const container = document.getElementById(containerId);
              if (!container) return;
              
              // 使用 Markmap 库
              const transformer = new markmap.Transformer();
              const { root, features } = transformer.transform(markdown);
              
              // 加载必要的资源
              const { styles, scripts } = transformer.getUsedAssets(features);
              if (styles) markmap.loadCSS(styles);
              if (scripts) markmap.loadJS(scripts);
              
              // 创建思维导图
              const mm = markmap.Markmap.create(container, {
                color: (d) => {
                  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];
                  return colors[d.depth % colors.length];
                },
                duration: 500,
                maxWidth: 300,
                paddingX: 8,
                spacingVertical: 8,
                spacingHorizontal: 120,
                fitRatio: 0.95,
                initialExpandLevel: -1
              });
              
              mm.setData(root);
              mm.fit();
              
              console.log('Markmap 初始化成功');
            } catch (error) {
              console.error('Markmap 初始化失败:', error);
              const container = document.getElementById(containerId);
              if (container) {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:16px;">思维导图加载失败: ' + error.message + '</div>';
              }
            }
          }
          
          // 开始检查 Markmap 是否加载完成
          setTimeout(waitForMarkmap, 200);
        })();
      </script>
    </div>
  `;
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

// 切换到思维导图模式
function switchToMindMapMode() {
  if (isInMindMapMode) return;
  
  try {
    const mainEditor = document.querySelector('.orca-block-editor-blocks') as HTMLElement;
    if (!mainEditor) {
      orca.notify('error', '找不到主编辑区域');
      return;
    }
    
    // 保存原始内容
    originalContent = mainEditor.innerHTML;
    
    // 提取页面结构
    const blocks = extractPageStructure();
    
    if (blocks.length === 0) {
      orca.notify('warn', '当前页面没有可显示的内容');
      return;
    }
    
    // 生成思维导图HTML
    const mindMapHTML = generateMindMapHTML(blocks);
    
    // 替换内容
    mainEditor.innerHTML = mindMapHTML;
    mainEditor.contentEditable = 'false';
    
    isInMindMapMode = true;
    updateButtonState();
    
    orca.notify('success', `已切换到思维导图模式 - ${blocks.length} 个节点`);
    
  } catch (error) {
    console.error('切换到思维导图模式失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `切换失败: ${errorMsg}`);
  }
}

// 切换回编辑模式
function switchToEditMode() {
  if (!isInMindMapMode || !originalContent) return;
  
  try {
    const mainEditor = document.querySelector('.orca-block-editor-blocks') as HTMLElement;
    if (!mainEditor) {
      orca.notify('error', '找不到主编辑区域');
      return;
    }
    
    // 恢复原始内容
    mainEditor.innerHTML = originalContent;
    mainEditor.contentEditable = 'plaintext-only';
    
    isInMindMapMode = false;
    originalContent = '';
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
  orca.notify('success', '思维导图插件已启用 - 右上角🧠按钮');
}

// 插件卸载函数
async function unload() {
  console.log('页面思维导图插件开始卸载...');

  // 如果在思维导图模式，先切换回编辑模式
  if (isInMindMapMode) {
    switchToEditMode();
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
  originalContent = '';

  console.log('页面思维导图插件卸载完成');
  orca.notify('info', '思维导图插件已禁用');
}

export { load, unload };