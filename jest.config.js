module.exports = {
  preset: '@react-native/jest-preset',
  // The preset only transforms react-native packages; navigation and
  // notifee ship untranspiled ESM and need the same treatment.
  transformIgnorePatterns: [
    'node_modules/(?!(?:jest-)?react-native|@react-native(?:-community)?|@react-navigation|@notifee|@op-engineering|react-native-)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
