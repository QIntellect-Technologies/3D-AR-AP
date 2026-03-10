module.exports = {
  root: true,
  extends: ['@react-native'],
  overrides: [
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
