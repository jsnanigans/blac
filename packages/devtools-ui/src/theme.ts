/** Shared design tokens for BlaC DevTools UI */
export const T = {
  // Backgrounds (darkest → lightest)
  bg0: '#141414',
  bg1: '#1a1a1a',
  bg2: '#1e1e1e',
  bg3: '#252526',
  bg4: '#2d2d2d',
  bgHover: '#2a2a2a',
  bgSelected: '#094771',
  bgAccent: 'rgba(0,122,204,0.12)',

  // Borders
  border0: '#2a2a2a',
  border1: '#333',
  border2: '#3e3e3e',
  border3: '#444',
  borderAccent: '#007acc',

  // Text
  text0: '#e0e0e0',
  text1: '#aaa',
  text2: '#666',
  text3: '#444',
  textCode: '#4FC3F7',
  textAccent: '#007acc',

  // Semantic
  success: '#4CAF50',
  error: '#ef4444',
  warning: '#FFB74D',
  info: '#2196F3',
  errorBg: '#7f1d1d',
  errorText: '#fca5a5',
  warningBg: '#854d0e',
  warningText: '#fde68a',

  // Typography
  fontMono: '"ui-monospace", "Menlo", "Monaco", "Consolas", monospace',

  // Shape
  radius: '4px',
  radiusSm: '3px',
} as const;
