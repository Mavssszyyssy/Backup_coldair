import React from "react";
import { Text } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { UserProvider, useUserContext } from "../context/UserContext";
import * as api from "./api";
import {
  beginBackendConnection,
  confirmBackendRecovery,
  failBackendConnection,
} from "./backendConnectionState";

jest.mock("./api", () => ({ me: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue("saved-session-token"),
  setItem: jest.fn().mockResolvedValue(),
  removeItem: jest.fn().mockResolvedValue(),
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

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue("saved-session-token");
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
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();

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

  await waitFor(() => expect(AsyncStorage.removeItem).toHaveBeenCalledWith("auth_token"));
  expect(view.getByText("ready|no-token|no-user")).toBeTruthy();
  view.unmount();
});
