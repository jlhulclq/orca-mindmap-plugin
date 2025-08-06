// 工具函数单元测试
import { buildTree, sanitizeInput, findRootBlocks } from '../utils/helpers';
import { Block } from '../types';

describe('工具函数测试', () => {
  test('构建树形结构', () => {
    const blocks: Record<string, Block> = {
      '1': { id: '1', text: '根节点', children: ['2', '3'] },
      '2': { id: '2', text: '子节点1', children: [] },
      '3': { id: '3', text: '子节点2', children: ['4'] },
      '4': { id: '4', text: '孙节点', children: [] }
    };
    
    const tree = buildTree('1', blocks);
    
    expect(tree.id).toBe('1');
    expect(tree.content).toBe('根节点');
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].content).toBe('子节点1');
    expect(tree.children[1].content).toBe('子节点2');
    expect(tree.children[1].children).toHaveLength(1);
    expect(tree.children[1].children[0].content).toBe('孙节点');
  });

  test('输入清理功能', () => {
    const maliciousInput = '<script>alert("xss")</script>正常内容<iframe>test</iframe>';
    const cleaned = sanitizeInput(maliciousInput);
    
    expect(cleaned).toBe('正常内容');
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('<iframe>');
  });

  test('长文本截断', () => {
    const longText = 'a'.repeat(300);
    const cleaned = sanitizeInput(longText);
    
    expect(cleaned.length).toBe(200);
    expect(cleaned.endsWith('...')).toBe(true);
  });

  test('查找根块', () => {
    const blocks: Record<string, Block> = {
      '1': { id: '1', text: '根节点1', children: ['2'] },
      '2': { id: '2', text: '子节点', children: [], parent: '1' },
      '3': { id: '3', text: '根节点2', children: [] }
    };
    
    const roots = findRootBlocks(blocks);
    
    expect(roots).toHaveLength(2);
    expect(roots).toContain('1');
    expect(roots).toContain('3');
    expect(roots).not.toContain('2');
  });

  test('处理无效输入', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput(null as any)).toBe('');
    expect(sanitizeInput(undefined as any)).toBe('');
    expect(sanitizeInput(123 as any)).toBe('');
  });

  test('处理不存在的块', () => {
    const blocks: Record<string, Block> = {
      '1': { id: '1', text: '存在的块', children: [] }
    };
    
    const tree = buildTree('999', blocks);
    
    expect(tree.id).toBe('999');
    expect(tree.content).toBe('未知块');
    expect(tree.children).toHaveLength(0);
  });

  test('表格内容过滤功能', () => {
    const inputWithTable = `
    普通文本内容
    <div class="orca-no-editable-container">
      <div class="orca-table2">
        <div class="orca-table2-cell">表格内容1</div>
        <div class="orca-table2-cell">表格内容2</div>
      </div>
    </div>
    更多普通文本
    `;
    
    const cleaned = sanitizeInput(inputWithTable);
    
    expect(cleaned).toContain('普通文本内容');
    expect(cleaned).toContain('更多普通文本');
    expect(cleaned).not.toContain('orca-no-editable-container');
    expect(cleaned).not.toContain('orca-table2');
    expect(cleaned).not.toContain('表格内容1');
    expect(cleaned).not.toContain('表格内容2');
  });

  test('复杂表格结构过滤', () => {
    const complexTable = `
    正常内容
    <div class="orca-table2-cell orca-table2-hl orca-table2-vc">
      <div class="orca-container orca-block">
        <span class="orca-inline">阶段</span>
      </div>
    </div>
    结束内容
    `;
    
    const cleaned = sanitizeInput(complexTable);
    
    expect(cleaned).toContain('正常内容');
    expect(cleaned).toContain('结束内容');
    expect(cleaned).not.toContain('orca-table2-cell');
    expect(cleaned).not.toContain('阶段');
  });
});