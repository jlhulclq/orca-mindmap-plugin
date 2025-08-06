import { TreeNode } from '../types';

// 思维导图渲染器
export class MindMapRenderer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  // 渲染树形结构为HTML
  renderTreeAsHTML(node: TreeNode, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    const fontSize = Math.max(12, 16 - depth * 2);
    const color = this.getTextColor(depth);
    const bullet = this.getBullet(depth);
    
    let html = `${indent}<div class="mindmap-node" data-level="${depth}" data-id="${node.id}" style="margin: 5px 0; font-size: ${fontSize}px; color: ${color};">`;
    html += `${bullet}${node.content}`;
    html += '</div>\n';
    
    for (const child of node.children) {
      html += this.renderTreeAsHTML(child, depth + 1);
    }
    
    return html;
  }

  // 生成完整的思维导图面板HTML
  generateMindMapHTML(trees: TreeNode[], totalBlocks: number): string {
    let htmlContent = `
      <div class="mindmap-container">
        <div class="mindmap-header">
          <h3 class="mindmap-title">
            📖 笔记大纲结构
          </h3>
          <div class="mindmap-controls">
            <button class="mindmap-btn" onclick="this.closest('.mindmap-container').querySelector('.mindmap-content').classList.toggle('collapsed')">
              切换折叠
            </button>
          </div>
        </div>
        <div class="mindmap-content">
    `;
    
    for (const tree of trees) {
      htmlContent += this.renderTreeAsHTML(tree);
    }
    
    htmlContent += `
        </div>
        <div class="mindmap-footer">
          💡 层级结构可视化 | 共 ${totalBlocks} 个块
        </div>
      </div>
    `;

    return htmlContent;
  }

  // 创建交互式思维导图组件
  createInteractiveMindMap(trees: TreeNode[], totalBlocks: number): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = this.generateMindMapHTML(trees, totalBlocks);
    
    // 添加交互功能
    this.addInteractivity(div);
    
    return div;
  }

  // 添加交互功能
  private addInteractivity(container: HTMLElement): void {
    // 点击节点展开/折叠子节点
    container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const node = target.closest('.mindmap-node');
      
      if (node && (node as HTMLElement).dataset.level !== '0') {
        // 查找所有子节点
        const currentLevel = parseInt((node as HTMLElement).dataset.level || '0');
        let nextSibling = node.nextElementSibling;
        const childNodes: Element[] = [];
        
        while (nextSibling && nextSibling.classList.contains('mindmap-node')) {
          const siblingLevel = parseInt(((nextSibling as HTMLElement).dataset?.level) || '0');
          
          if (siblingLevel <= currentLevel) {
            break;
          }
          
          if (siblingLevel === currentLevel + 1) {
            childNodes.push(nextSibling);
          }
          
          nextSibling = nextSibling.nextElementSibling;
        }
        
        // 切换子节点显示状态
        childNodes.forEach(child => {
          (child as HTMLElement).style.display = 
            (child as HTMLElement).style.display === 'none' ? 'block' : 'none';
        });
        
        // 更新节点样式
        node.classList.toggle('collapsed');
      }
    });

    // 添加悬停效果
    container.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const node = target.closest('.mindmap-node');
      
      if (node) {
        node.classList.add('hover');
      }
    });

    container.addEventListener('mouseout', (event) => {
      const target = event.target as HTMLElement;
      const node = target.closest('.mindmap-node');
      
      if (node) {
        node.classList.remove('hover');
      }
    });
  }

  // 获取文本颜色
  private getTextColor(depth: number): string {
    const colors = [
      'var(--orca-color-text-1)',
      'var(--orca-color-text-2)', 
      'var(--orca-color-text-3)',
      'var(--orca-color-primary)',
      'var(--orca-color-secondary)'
    ];
    
    return colors[Math.min(depth, colors.length - 1)];
  }

  // 获取项目符号
  private getBullet(depth: number): string {
    const bullets = ['● ', '○ ', '▪ ', '▫ ', '‣ '];
    return bullets[Math.min(depth, bullets.length - 1)];
  }
}