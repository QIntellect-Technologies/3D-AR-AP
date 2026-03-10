const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  // Ignore native build output folders that get created/deleted during build
  watchFolders: [__dirname],
  resolver: {
    blockList: [
      /.*\/android\/\.cxx\/.*/,
      /.*\/android\/build\/.*/,
      /.*\/ios\/build\/.*/,
      /.*\/\.gradle\/.*/,
    ],
  },
});
