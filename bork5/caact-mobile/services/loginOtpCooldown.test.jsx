import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import LoginScreen from "../app/(auth)/login";
import RecoverPasswordScreen from "../app/(auth)/recover/factor/1";
import { forgotPassword } from "./api";

const mockLogin = jest.fn();
const mockVerify = jest.fn();
const mockResend = jest.fn();
jest.mock("../context/UserContext", () => ({
  useUserContext: () => ({ login: mockLogin, verifyEmailLogin: mockVerify, resendLoginEmail: mockResend }),
}));
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ t: value => value }) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ identifier: "customer@example.com" }),
}));
jest.mock("./api", () => ({ forgotPassword: jest.fn(), resetPassword: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
});

test("failed login stays on password form and successful challenge respects resend cooldown", async () => {
  mockLogin.mockResolvedValueOnce({ success: false, error: "Incorrect credentials." }).mockResolvedValueOnce({
    requiresEmailVerification: true,
    challengeToken: "challenge",
    maskedEmail: "c***@example.com",
    resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
  });
  await render(<LoginScreen />);
  expect(screen.getByLabelText("Email or Username").props.placeholder).toBe("Email address or username");
  expect(screen.getByLabelText("Password").props.placeholder).toBe("Enter your password");
  await fireEvent.changeText(screen.getByLabelText("Email or Username"), "customer@example.com");
  await fireEvent.changeText(screen.getByLabelText("Password"), "WrongPass123!");
  await fireEvent.press(screen.getByText("Sign In"));
  expect((await screen.findAllByText("Incorrect credentials.")).length).toBeGreaterThan(0);
  expect(mockVerify).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Sign In"));
  expect(await screen.findByLabelText("Email verification code")).toBeTruthy();
  const resend = screen.getByRole("button", { name: /Resend code \(/ });
  expect(resend.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(resend);
  expect(mockResend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("I have a different account"));
  expect(screen.getByLabelText("Email or Username")).toBeTruthy();
});

test("reset email code cannot be resent during the server cooldown", async () => {
  forgotPassword.mockResolvedValue({ success: true, resendAvailableAt: new Date(Date.now() + 60000).toISOString() });
  await render(<RecoverPasswordScreen />);
  await fireEvent.press(screen.getByText("Send Reset Code"));
  await waitFor(() => expect(screen.getByLabelText("Reset Code")).toBeTruthy());
  const resend = screen.getByRole("button", { name: /Resend Code \(/ });
  expect(resend.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(resend);
  expect(forgotPassword).toHaveBeenCalledTimes(1);
});
