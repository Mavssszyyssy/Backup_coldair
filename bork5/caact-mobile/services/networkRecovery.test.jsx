import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

import { reportBackendUnavailable } from "./backendConnectionState";
import {
  DEVICE_OFFLINE_MESSAGE,
  DEVICE_OFFLINE_PATH,
  startNetworkRecovery,
} from "./networkRecovery";

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
  refresh: jest.fn(),
}));
jest.mock("./backendConnectionState", () => ({
  reportBackendUnavailable: jest.fn(),
}));

let networkListener;
let appStateListener;
const removeNetwork = jest.fn();
const removeAppState = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  networkListener = null;
  appStateListener = null;
  NetInfo.addEventListener.mockImplementation((listener) => {
    networkListener = listener;
    return removeNetwork;
  });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    appStateListener = listener;
    return { remove: removeAppState };
  });
  NetInfo.refresh.mockResolvedValue();
  NetInfo.fetch.mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: "wifi",
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("shows an immediate device-network message and probes after reconnection", async () => {
  const probe = jest.fn().mockResolvedValue({ connected: true });
  const stop = startNetworkRecovery(probe);

  networkListener({ isConnected: true, isInternetReachable: true, type: "wifi" });
  expect(probe).not.toHaveBeenCalled();

  networkListener({ isConnected: false, isInternetReachable: false, type: "none" });
  expect(reportBackendUnavailable).toHaveBeenCalledWith(
    DEVICE_OFFLINE_PATH,
    DEVICE_OFFLINE_MESSAGE,
  );

  networkListener({ isConnected: true, isInternetReachable: true, type: "cellular" });
  await Promise.resolve();
  expect(probe).toHaveBeenCalledTimes(1);

  stop();
  expect(removeNetwork).toHaveBeenCalledTimes(1);
  expect(removeAppState).toHaveBeenCalledTimes(1);
});

test("checks the database again when a long-backgrounded app becomes active", async () => {
  const probe = jest.fn().mockResolvedValue({ connected: true });
  startNetworkRecovery(probe);

  appStateListener("active");
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(NetInfo.refresh).toHaveBeenCalledTimes(1);
  expect(NetInfo.fetch).toHaveBeenCalledTimes(1);
  expect(probe).toHaveBeenCalledTimes(1);
});

test("a direct Wi-Fi to mobile-data change triggers recovery without a false offline event", async () => {
  const probe = jest.fn().mockResolvedValue({ connected: true });
  startNetworkRecovery(probe);

  networkListener({ isConnected: true, isInternetReachable: true, type: "wifi" });
  networkListener({ isConnected: true, isInternetReachable: true, type: "cellular" });
  await Promise.resolve();

  expect(reportBackendUnavailable).not.toHaveBeenCalled();
  expect(probe).toHaveBeenCalledTimes(1);
});
