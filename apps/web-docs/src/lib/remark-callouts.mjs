// `:::note`, `:::tip`, `:::caution`, `:::danger` (optionally `:::tip[Title]`)
// container directives → <aside class="callout callout--tip">. Any other
// directive is turned back into plain text so stray colons never vanish.

const KINDS = {
  note: 'Note',
  tip: 'Tip',
  caution: 'Caution',
  danger: 'Danger',
};

/** @param {any} node @param {(node: any, index: number, parent: any) => void} fn */
function visit(node, fn, index = 0, parent = null) {
  fn(node, index, parent);
  node.children?.forEach((child, i) => visit(child, fn, i, node));
}

export function remarkCallouts() {
  /** @param {any} tree */
  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (node.type === 'textDirective' || node.type === 'leafDirective') {
        parent?.children.splice(index, 1, {
          type: 'text',
          value: `:${node.name}`,
        });
        return;
      }
      if (node.type !== 'containerDirective') return;
      const kind = KINDS[node.name] ? node.name : 'note';
      const labelIndex = node.children.findIndex((c) => c.data?.directiveLabel);
      const label =
        labelIndex >= 0
          ? node.children.splice(labelIndex, 1)[0].children
          : [{ type: 'text', value: KINDS[kind] }];
      node.data = {
        hName: 'aside',
        hProperties: {
          className: ['callout', `callout--${kind}`],
          'aria-label': KINDS[kind],
        },
      };
      node.children.unshift({
        type: 'paragraph',
        data: { hName: 'p', hProperties: { className: ['callout__title'] } },
        children: label,
      });
    });
  };
}
