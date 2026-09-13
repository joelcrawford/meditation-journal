// Native modules have no bridge under jest — use the mocks the
// libraries themselves ship.
jest.mock('@notifee/react-native', () =>
  require('@notifee/react-native/jest-mock'),
);
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@op-engineering/op-sqlite', () => {
  // Aggregate queries (COUNT/MAX/...) always yield one row; give every
  // query a single zero-valued row so shape invariants hold in tests.
  const zeroRow = new Proxy({}, {get: () => 0});
  const result = {rows: [zeroRow]};
  return {
    open: jest.fn(() => ({
      execute: jest.fn(async () => result),
      executeSync: jest.fn(() => result),
      transaction: jest.fn(async (fn) => fn({execute: jest.fn(async () => result)})),
      close: jest.fn(),
    })),
  };
});
jest.mock('react-native-mmkv', () => {
  const makeStore = () => {
    const data = new Map();
    return {
      getString: (k) => data.get(k),
      getNumber: (k) => data.get(k),
      getBoolean: (k) => data.get(k),
      set: (k, v) => data.set(k, v),
      delete: (k) => data.delete(k),
      contains: (k) => data.has(k),
      clearAll: () => data.clear(),
    };
  };
  return {createMMKV: jest.fn(makeStore), MMKV: jest.fn(makeStore)};
});
