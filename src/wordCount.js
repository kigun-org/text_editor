// Count authored text only. Keep inline fragments together across style changes.
function inlineText(content) {
  if (!Array.isArray(content)) return '';
  return content.map(node => {
    if (typeof node === 'string') return node;
    if (node.type === 'text') return node.text || '';
    if (node.type === 'link') return inlineText(node.content);
    return '';
  }).join('');
}

export function countWords(blocks) {
  const parts = [];
  function visit(block) {
    if (Array.isArray(block.content)) parts.push(inlineText(block.content));
    if (block.content?.type === 'tableContent') {
      for (const row of block.content.rows || []) {
        for (const cell of row.cells || []) {
          parts.push(inlineText(Array.isArray(cell) ? cell : cell.content));
        }
      }
    }
    if (block.type === 'image') parts.push(block.props?.caption || '');
    for (const child of block.children || []) visit(child);
  }
  for (const block of blocks || []) visit(block);
  return parts.join('\n').split(/\s+/u).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
}
