import React from "react";
import { Text } from "react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { fireEvent, screen } from "@testing-library/react-native";
import { UserProvider } from "../context/UserContext";
import { CartProvider } from "../context/CartContext";
import AuthLayout from "../app/(auth)/_layout";
import Login from "../app/(auth)/login";

jest.mock("../services/api", () => ({
  login: jest.fn().mockResolvedValue({ requiresEmailVerification: true, challengeToken: "challenge", maskedEmail: "c***@example.com" }),
  verifyLoginEmail: jest.fn().mockResolvedValue({ success: true, token: "fixture-token", user: { id: "customer-1", role: "customer", status: "active", customerOnboardedAt: "2026-10-01" } }),
  resendLoginEmail: jest.fn(),
}));
jest.mock("../services/sessionCache", () => ({ clearOperationalSessionCache: jest.fn().mockResolvedValue() }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(), removeItem: jest.fn().mockResolvedValue() }));

test("customer reaches home after a verified login code", async () => {
  await renderRouter({
    _layout: () => <UserProvider><CartProvider><Stack /></CartProvider></UserProvider>,
    "(auth)/_layout": AuthLayout,
    "(auth)/sign-in": Login,
    "customer/home": () => <Text>Customer home fixture</Text>,
  }, { initialUrl: "/sign-in" });
  await fireEvent.changeText(await screen.findByPlaceholderText("Email address or username"), "customer@example.com");
  await fireEvent.changeText(screen.getByLabelText("Password"), "FixturePass1!");
  await fireEvent.press(screen.getByText("Sign In"));
  await fireEvent.changeText(await screen.findByPlaceholderText("000000"), "123456");
  await fireEvent.press(screen.getByText("Verify and Sign In"));
  expect(await screen.findByText("Customer home fixture")).toBeTruthy();
}, 15000);
