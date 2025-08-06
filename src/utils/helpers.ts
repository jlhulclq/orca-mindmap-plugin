import { Block, TreeNode } from '../types';


// 简化的表格相关块检查
function isTableRelatedBlock(block: Block): boolean {
  if (!block.text) return false;
  
  // 表格关键词列表
  const tableKeywords = ['阶段', '功能与特点'];
  const hasTableKeyword = tableKeywords.some(keyword => block.text.includes(keyword));
  
  // 表格单元格模式：数字.空格中文
  const isTableCellPattern = /^\d+\.\s*[\u4e00-\u9fff]+$/.test(block.text.trim());
  
  return hasTableKeyword || isTableCellPattern;
}

// 简化的输入清理函数
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;
  
  // 基本安全清理
  sanitized = sanitized.replace(/<script.*?>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe.*?>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/javascript:[^;]*;?/gi, '');
  
  // 移除所有HTML标签，保留纯文本
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // 清理多余的空白字符
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // 限制长度
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }
  
  return sanitized.trim();
}

// 构建树形结构 - 优化版本
export function buildTree(blockId: string, allBlocks: Record<string, Block>, level: number = 0): TreeNode {
  const block = allBlocks[blockId];
  
  if (!block || !block.id) {
    console.warn(`无效块: ${blockId}`);
    return {
      id: blockId || 'unknown',
      content: '',
      children: [],
      level,
      parent: undefined
    };
  }

  // 快速过滤：跳过无内容或表格相关块
  const content = sanitizeInput(block.text || '');
  if (!content.trim() || block.type === 'table2' || isTableRelatedBlock(block)) {
    return {
      id: block.id,
      content: '',
      children: [],
      level,
      parent: block.parent
    };
  }

  const children = (block.children || [])
    .filter(childId => {
      const childBlock = allBlocks[childId];
      return childBlock && childBlock.id && childBlock.text?.trim();
    })
    .map(childId => buildTree(childId, allBlocks, level + 1))
    .filter(child => child.content.trim().length > 0);

  return {
    id: block.id,
    content: content,
    children,
    level,
    parent: block.parent
  };
}

// 查找根块 - 改进版本，排除无效块
export function findRootBlocks(blocks: Record<string, Block>): string[] {
  const allBlockIds = Object.keys(blocks);
  return allBlockIds.filter(id => {
    const block = blocks[id];
    // 排除无效块
    if (!block || !block.id || !block.text?.trim()) {
      return false;
    }
    // 排除表格相关块
    if (block.type === 'table2' || isTableRelatedBlock(block)) {
      return false;
    }
    return !block.parent || !blocks[block.parent];
  });
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 错误边界包装器
export function withErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  fallback?: (...args: Parameters<T>) => ReturnType<T>
): T {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      console.error('函数执行出错:', error);
      if (window.orca) {
        window.orca.notify('error', '操作失败，请重试');
      }
      
      if (fallback) {
        return fallback(...args);
      }
      
      return null;
    }
  }) as T;
}