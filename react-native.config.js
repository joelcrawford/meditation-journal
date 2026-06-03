module.exports = {
  assets: ['./assets/fonts/', './assets/sounds/'],
  dependencies: {
    // expo is a transitive dep of @expo-google-fonts — disable its native linking
    // since we don't use expo-modules-core in this project.
    expo: {
      platforms: {ios: null, android: null},
    },
  },
};
