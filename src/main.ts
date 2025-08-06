/**
 * 虎鲸笔记大纲插件
 * 将笔记层级结构可视化为交互式思维导图
 */

import './styles/main.css';
import { Block, TreeNode } from './types';
import { buildTree, findRootBlocks, sanitizeInput, debounce, withErrorBoundary } from './utils/helpers';
import { MindMapRenderer } from './components/MindMap';

// 全局变量
const orca = window.orca;
let mindMapPanel: string | null = null;
let mindMapRenderer: MindMapRenderer | null = null;

// 主要功能：显示思维导图
async function showMindMap() {
  try {
    const currentBlocks = orca.state.blocks;
    
    if (!currentBlocks || Object.keys(currentBlocks).length === 0) {
      orca.notify('warn', '当前笔记没有内容块');
      return;
    }

    // 找到根块
    const rootBlockIds = findRootBlocks(currentBlocks);

    if (rootBlockIds.length === 0) {
      orca.notify('warn', '未找到根级块');
      return;
    }

    // 构建树形结构
    const trees = rootBlockIds.map(rootId => buildTree(rootId, currentBlocks));
    
    // 过滤空树
    const validTrees = trees.filter(tree => tree.content.trim().length > 0);
    
    if (validTrees.length === 0) {
      orca.notify('warn', '没有有效的内容块');
      return;
    }

    // 关闭现有面板
    if (mindMapPanel) {
      orca.nav.closePanel(mindMapPanel);
    }

    // 创建渲染器
    if (!mindMapRenderer) {
      const tempDiv = document.createElement('div');
      mindMapRenderer = new MindMapRenderer(tempDiv);
    }

    // 创建新面板
    mindMapPanel = await orca.nav.addPanel('outline-mindmap', {
      title: '大纲视图',
      view: 'custom',
      component: () => {
        return mindMapRenderer!.createInteractiveMindMap(validTrees, Object.keys(currentBlocks).length);
      },
      position: 'right',
      width: '40%'
    });

    orca.notify('success', '大纲视图已显示');
    
    // 保存当前布局数据
    try {
      const layoutData = {
        timestamp: Date.now(),
        blockCount: Object.keys(currentBlocks).length,
        treeCount: validTrees.length
      };
      await orca.plugins.setData('outline-plugin', 'last-layout', JSON.stringify(layoutData));
    } catch (error) {
      console.warn('保存布局数据失败:', error);
    }

  } catch (error) {
    console.error('显示大纲失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `显示大纲失败: ${errorMessage}`);
  }
}

// 切换思维导图显示/隐藏
function toggleMindMap() {
  if (mindMapPanel) {
    orca.nav.closePanel(mindMapPanel);
    mindMapPanel = null;
    orca.notify('info', '大纲视图已关闭');
  } else {
    showMindMap();
  }
}

// 刷新思维导图
const refreshMindMap = debounce(() => {
  if (mindMapPanel) {
    showMindMap();
  }
}, 500);

// 处理块更新事件
function handleBlockUpdate(blockId: string) {
  console.log('块已更新:', blockId);
  refreshMindMap();
}

// 处理主题变更事件
function handleThemeChange(theme: string) {
  console.log('主题已切换:', theme);
  // CSS变量会自动适配新主题，无需额外处理
}

// 检查兼容性
function checkCompatibility(): boolean {
  if (!orca || !orca.state || !orca.commands) {
    console.error('不兼容的虎鲸笔记版本');
    return false;
  }
  
  if (orca.state.apiVersion) {
    const [major, minor] = orca.state.apiVersion.split('.').map(Number);
    if (major < 1 || (major === 1 && minor < 5)) {
      console.error('需要虎鲸笔记 1.5.0 或更高版本');
      return false;
    }
  }
  
  return true;
}

// 初始化插件设置
async function initializePlugin() {
  try {
    // 设置插件配置项
    await orca.plugins.setSettingsSchema('outline-plugin', {
      autoRefresh: {
        label: '自动刷新',
        type: 'boolean',
        defaultValue: true,
        description: '当笔记内容变化时自动刷新大纲视图'
      },
      maxDepth: {
        label: '最大显示层级',
        type: 'number',
        defaultValue: 5,
        description: '限制大纲显示的最大层级数'
      },
      theme: {
        label: '显示主题',
        type: 'string',
        choices: ['auto', 'light', 'dark'],
        defaultValue: 'auto',
        description: '大纲视图的显示主题'
      }
    });
    
    console.log('插件设置初始化完成');
  } catch (error) {
    console.warn('初始化插件设置失败:', error);
  }
}

// 包装函数以添加错误处理
const safeShowMindMap = withErrorBoundary(showMindMap);
const safeToggleMindMap = withErrorBoundary(toggleMindMap, () => {
  orca.notify('error', '切换大纲视图失败');
});

// 插件生命周期：加载
export async function load(pluginName: string) {
  try {
    console.log(`大纲插件 ${pluginName} 开始加载...`);

    // 检查兼容性
    if (!checkCompatibility()) {
      orca.notify('error', '插件版本不兼容，请更新虎鲸笔记');
      return;
    }

    // 初始化插件
    await initializePlugin();

    // 注册命令
    orca.commands.registerCommand(
      'outline-plugin.showMindMap',
      safeShowMindMap,
      '显示大纲视图'
    );

    orca.commands.registerCommand(
      'outline-plugin.toggleMindMap', 
      safeToggleMindMap,
      '切换大纲视图'
    );

    // 添加工具栏按钮
    orca.toolbar.registerToolbarButton('outline-plugin.button', {
      icon: 'ti ti-hierarchy',
      tooltip: '显示大纲视图',
      command: 'outline-plugin.showMindMap'
    });

    // 注册快捷键
    orca.commands.registerShortcut(
      'Ctrl+M',
      'outline-plugin.toggleMindMap'
    );

    // 注册事件监听器
    orca.broadcasts.registerHandler('core.block.updated', handleBlockUpdate);
    orca.broadcasts.registerHandler('core.block.created', handleBlockUpdate);
    orca.broadcasts.registerHandler('core.block.deleted', handleBlockUpdate);
    orca.broadcasts.registerHandler('core.themeChanged', handleThemeChange);

    console.log(`大纲插件 ${pluginName} 加载完成`);
    orca.notify('success', '大纲插件已启用');

  } catch (error) {
    console.error('大纲插件加载失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    orca.notify('error', `大纲插件加载失败: ${errorMessage}`);
  }
}

// 插件生命周期：卸载
export async function unload() {
  try {
    console.log('大纲插件开始卸载...');

    // 关闭面板
    if (mindMapPanel) {
      orca.nav.closePanel(mindMapPanel);
      mindMapPanel = null;
    }

    // 清理渲染器
    mindMapRenderer = null;

    // 移除命令
    orca.commands.unregisterCommand('outline-plugin.showMindMap');
    orca.commands.unregisterCommand('outline-plugin.toggleMindMap');

    // 移除工具栏按钮
    orca.toolbar.unregisterToolbarButton('outline-plugin.button');

    // 移除快捷键
    orca.commands.unregisterShortcut('Ctrl+M');

    // 移除事件监听器
    orca.broadcasts.unregisterHandler('core.block.updated', handleBlockUpdate);
    orca.broadcasts.unregisterHandler('core.block.created', handleBlockUpdate);
    orca.broadcasts.unregisterHandler('core.block.deleted', handleBlockUpdate);
    orca.broadcasts.unregisterHandler('core.themeChanged', handleThemeChange);

    console.log('大纲插件卸载完成');
    orca.notify('info', '大纲插件已禁用');

  } catch (error) {
    console.error('大纲插件卸载失败:', error);
  }
}