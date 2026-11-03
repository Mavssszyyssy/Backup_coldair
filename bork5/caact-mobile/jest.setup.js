jest.mock(
  "@react-native-community/netinfo",
  () => require("@react-native-community/netinfo/jest/netinfo-mock.js"),
);

// SDK 58's native notification emitter is unavailable in Jest. Individual
// notification tests replace this with their own explicit behavior mocks.
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied", canAskAgain: false }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied", canAskAgain: false }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

jest.mock("expo-font", () => {
  const actual = jest.requireActual("expo-font");
  return {
    ...actual,
    isLoaded: jest.fn().mockReturnValue(true),
    loadAsync: jest.fn().mockResolvedValue(undefined),
  };
});
