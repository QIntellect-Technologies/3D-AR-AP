module.exports = {
  root: true,
  ignorePatterns: ['index.js', 'react-native.config.js', 'babel.config.js', 'metro.config.js'],
  extends: ['@react-native'],
  overrides: [
    {
      files: ['.eslintrc.js', 'react-native.config.js', 'babel.config.js', 'metro.config.js'],
      parser: 'espree',
      env: { node: true },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'script',
      },
    },
    {
      files: ['index.js'],
      env: { node: true },
      parserOptions: {
        sourceType: 'script',
        requireConfigFile: false,
      },
    },
    {
      files: ['babel.config.js', 'metro.config.js', 'react-native.config.js'],
      env: { node: true },
      parserOptions: {
        sourceType: 'script',
        requireConfigFile: false,
      },
    },
  ],
};
