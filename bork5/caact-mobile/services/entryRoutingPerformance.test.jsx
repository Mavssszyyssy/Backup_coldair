import React from "react";
import { act, render } from "@testing-library/react-native";
import Index from "../app/index";
import { checkBackendConnection } from "./api";

const mockRefreshCurrentUser = jest.fn();
let mockSession;

jest.mock("expo-router", () => ({
  Redirect: ({ href }) => {
    const { Text } = require("react-native");
    return <Text>{`redirect:${href}`}</Text>;
  },
}));
jest.mock("../context/UserContext", () => ({
  useUserContext: () => mockSession,
}));
jest.mock("./api", () => ({ checkBackendConnection: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockSession = {
    current: null,
    token: null,
    initialized: true,
    refreshCurrentUser: mockRefreshCurrentUser,
    resolveHomeRoute: () => "/customer/home",
  };
});

test("signed-out launch opens sign-in without waiting for a catalogue probe", async () => {
  const view = await render(<Index />);
  expect(view.getByText("redirect:/sign-in")).toBeTruthy();
  expect(checkBackendConnection).not.toHaveBeenCalled();
  view.unmount();
});

test("restored account opens home without repeating /auth/me", async () => {
  mockSession = { ...mockSession, current: { id: "customer-1" }, token: "saved-token" };
  const view = await render(<Index />);
  expect(view.getByText("redirect:/customer/home")).toBeTruthy();
  expect(checkBackendConnection).not.toHaveBeenCalled();
  view.unmount();
});

test("a saved token with failed restoration retains the connection retry", async () => {
  mockSession = { ...mockSession, token: "saved-token" };
  checkBackendConnection.mockResolvedValue({ connected: false, message: "Server unavailable" });
  const view = await render(<Index />);
  await act(async () => { await Promise.resolve(); });
  expect(view.getByText("Try Again")).toBeTruthy();
  expect(checkBackendConnection).toHaveBeenCalledTimes(1);
  expect(mockRefreshCurrentUser).not.toHaveBeenCalled();
  view.unmount();
});
