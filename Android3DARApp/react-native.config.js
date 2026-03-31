module.exports = {
  dependencies: {
    // This app uses a custom native OpenCV module under android/opencv.
    // Disable fast-opencv autolinking to avoid duplicated/incompatible OpenCV libs.
    'react-native-fast-opencv': {
      platforms: {
        android: null,
      },
    },
  },
};
