module.exports = {
  presets: [
    ['@babel/env', { modules: false }],
    '@babel/preset-typescript',
    '@babel/preset-react',
  ],
  plugins: ['@babel/plugin-proposal-decorators'],
};
