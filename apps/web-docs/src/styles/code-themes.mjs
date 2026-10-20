// Syntax themes in the logo palette. Frame and background colours come from
// Starlight's UI tokens (useStarlightUiThemeColors), so only tokens live here.

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
      'editorLineNumber.foreground': c.punctuation,
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
  fg: '#dddbe8',
  selection: '#2474ae55',
  comment: '#8a87a0',
  punctuation: '#a6a3ba',
  keyword: '#f37fbd',
  fn: '#6bb2e6',
  type: '#b8acf5',
  string: '#93d8b0',
  constant: '#f5b67a',
});

export const blacLight = theme('light', {
  fg: '#24223a',
  selection: '#2474ae33',
  comment: '#6b6884',
  punctuation: '#55526c',
  keyword: '#b62f7a',
  fn: '#1d669c',
  type: '#5a48b8',
  string: '#1d7a4c',
  constant: '#9a5410',
});
