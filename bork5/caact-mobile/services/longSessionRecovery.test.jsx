import React from "react";
import { Pressable, Text } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { UserProvider, useUserContext } from "../context/UserContext";
import * as api from "./api";
import {
  beginBackendConnection,
  confirmBackendRecovery,
  failBackendConnection,
} from "./backendConnectionState";
import { clearAuthToken, readAuthToken } from "./tokenStorage";

jest.mock("./api", () => ({ me: jest.fn(), addAddress: jest.fn() }));
jest.mock("./tokenStorage", () => ({
  readAuthToken: jest.fn().mockResolvedValue("saved-session-token"),
  writeAuthToken: jest.fn().mockResolvedValue(),
  clearAuthToken: jest.fn().mockResolvedValue(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(),
  removeItem: jest.fn().mockResolvedValue(),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn().mockResolvedValue(),
}));

function SessionProbe() {
  const { current, initialized, token } = useUserContext();
  return (
    <Text>
      {initialized ? "ready" : "loading"}|{token || "no-token"}|
      {current?.email || "no-user"}
    </Text>
  );
}

function AddressProbe() {
  const { current, saveDeliveryAddress } = useUserContext();
  return <><Text>{current?.addresses?.length || 0} saved</Text><Pressable onPress={() => saveDeliveryAddress({ name: "Maria Santos" })}><Text>Save test address</Text></Pressable></>;
}

beforeEach(() => {
  jest.clearAllMocks();
  readAuthToken.mockResolvedValue("saved-session-token");
});

test("keeps a saved session during a temporary backend failure and restores it after recovery", async () => {
  api.me
    .mockResolvedValueOnce({ success: false, status: 503 })
    .mockResolvedValueOnce({
      success: true,
      user: { id: "customer-1", role: "customer", email: "customer@example.com" },
    });

  const view = await render(
    <UserProvider>
      <SessionProbe />
    </UserProvider>,
  );

  await view.findByText("ready|saved-session-token|no-user");
  expect(clearAuthToken).not.toHaveBeenCalled();

  await act(async () => {
    beginBackendConnection("/orders");
    failBackendConnection("/orders");
    confirmBackendRecovery("/auth/me");
  });

  await view.findByText("ready|saved-session-token|customer@example.com");
  expect(api.me).toHaveBeenCalledTimes(2);
  view.unmount();
});

test("clears a saved session only when the backend rejects its authentication", async () => {
  api.me.mockResolvedValueOnce({ success: false, status: 401 });

  const view = await render(
    <UserProvider>
      <SessionProbe />
    </UserProvider>,
  );

  await waitFor(() => expect(clearAuthToken).toHaveBeenCalledTimes(1));
  expect(view.getByText("ready|no-token|no-user")).toBeTruthy();
  view.unmount();
});

test("successful address creation remains in local account state when the follow-up refresh is offline", async () => {
  api.me.mockResolvedValueOnce({ success: true, user: { id: "customer-1", role: "customer", addresses: [] } })
    .mockResolvedValueOnce({ success: false, status: 503 });
  api.addAddress.mockResolvedValue({ success: true, addresses: [{ id: "address-1", name: "Maria Santos", isDefault: true }] });
  const view = await render(<UserProvider><AddressProbe /></UserProvider>);
  await view.findByText("0 saved");
  await fireEvent.press(view.getByText("Save test address"));
  await view.findByText("1 saved");
  expect(api.addAddress).toHaveBeenCalledTimes(1);
  view.unmount();
});
