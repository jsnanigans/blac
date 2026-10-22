// Syntax themes in the Kinetic Risograph palette. Frame and background colours
// come from Starlight's UI tokens (useStarlightUiThemeColors), so every token
// here is tuned for WCAG AA contrast against both dark (#141222) and light
// (#f2eee6) code wells.

/**
 * @param {'dark' | 'light'} type
 * @param {Record<string, string>} c
 */
function theme(type, c) {
  return {
    name: `blac-${type}`,
    type,
    colors: {
      'editor.foreground': c.fg,
      'editor.selectionBackground': c.selection,
      'editorLineNumber.foreground': c.lineNumber,
    },
    tokenColors: [
      {
        scope: ['comment', 'punctuation.definition.comment'],
        settings: { foreground: c.comment, fontStyle: 'italic' },
      },
      {
        scope: ['punctuation', 'meta.brace', 'keyword.operator'],
        settings: { foreground: c.punctuation },
      },
      {
        scope: [
          'keyword',
          'storage',
          'keyword.operator.new',
          'keyword.operator.expression',
          'keyword.operator.ternary',
          'variable.language.this',
          'variable.language.super',
          'punctuation.definition.template-expression',
          'entity.name.tag',
        ],
        settings: { foreground: c.keyword },
      },
      {
        scope: [
          'entity.name.function',
          'support.function',
          'meta.function-call entity.name.function',
        ],
        settings: { foreground: c.fn },
      },
      {
        scope: [
          'entity.name.type',
          'entity.name.class',
          'entity.other.inherited-class',
          'support.type',
          'support.class',
          'support.class.component',
          'entity.name.namespace',
        ],
        settings: { foreground: c.type },
      },
      {
        scope: ['string', 'string.template', 'punctuation.definition.string'],
        settings: { foreground: c.string },
      },
      {
        scope: [
          'constant.numeric',
          'constant.language',
          'constant.character',
          'string.regexp',
          'entity.other.attribute-name',
        ],
        settings: { foreground: c.constant },
      },
      {
        scope: ['variable.other.property', 'meta.object-literal.key'],
        settings: { foreground: c.property },
      },
      {
        scope: ['support.type.property-name.json'],
        settings: { foreground: c.fn },
      },
      { scope: ['markup.inserted'], settings: { foreground: c.string } },
      { scope: ['markup.deleted'], settings: { foreground: c.keyword } },
      { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
      { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
      {
        scope: ['markup.heading'],
        settings: { foreground: c.fn, fontStyle: 'bold' },
      },
    ],
  };
}

export const blacDark = theme('dark', {
  fg: '#e8e5f7',
  selection: '#2b84d84d',
  lineNumber: '#7e789c',
  comment: '#948eb0',
  punctuation: '#b6b0cf',
  keyword: '#ff82bf',
  fn: '#6ec1ff',
  type: '#b8a8ff',
  string: '#67e8b8',
  constant: '#ffc857',
  property: '#d8d3f0',
});

export const blacLight = theme('light', {
  fg: '#1f1c33',
  selection: '#2b84d82e',
  lineNumber: '#6b6585',
  comment: '#635d7d',
  punctuation: '#4c4766',
  keyword: '#b51d67',
  fn: '#125699',
  type: '#432ec2',
  string: '#0d7552',
  constant: '#945800',
  property: '#2c2747',
});
