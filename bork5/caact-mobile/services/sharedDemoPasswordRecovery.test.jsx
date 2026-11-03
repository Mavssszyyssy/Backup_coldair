import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import RecoverPasswordScreen from "../app/(auth)/recover/factor/1";
import { forgotPassword, resetPassword } from "./api";

let mockLanguage = "English";
jest.mock("../hooks/useInterfaceLanguage", () => ({
  useInterfaceLanguage: () => ({ language: mockLanguage, t: value => require("./interfaceI18n").translateText(value, mockLanguage) }),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ identifier: "lanlords2025@gmail.com" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("./api", () => ({
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
}));

test("shared demo email recovery sends and resets for one explicit account login ID", async () => {
  mockLanguage = "English";
  forgotPassword.mockResolvedValue({ success: true });
  resetPassword.mockResolvedValue({ success: true });
  await render(<RecoverPasswordScreen />);

  await fireEvent.press(screen.getByText("Send Reset Code"));
  expect(await screen.findByText(/unique login ID for the demo account/i)).toBeTruthy();
  expect(forgotPassword).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText("Demo Account Login ID"), "tech.cavite.carl");
  await fireEvent.press(screen.getByText("Send Reset Code"));
  await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith(
    "lanlords2025@gmail.com",
    "email",
    "tech.cavite.carl",
  ));

  await fireEvent.changeText(screen.getByLabelText("Reset Code"), "123456");
  await fireEvent.changeText(screen.getByLabelText("New Password"), "StrongDemoPass1!");
  await fireEvent.changeText(screen.getByLabelText("Confirm New Password"), "StrongDemoPass1!");
  await fireEvent.press(screen.getByRole("button", { name: "Reset Password" }));

  await waitFor(() => expect(resetPassword).toHaveBeenCalledWith(
    "lanlords2025@gmail.com",
    "123456",
    "StrongDemoPass1!",
    "email",
    "tech.cavite.carl",
  ));
  expect(await screen.findByText("Password reset complete")).toBeTruthy();
});

test("recovery labels follow Filipino preference without changing the account identifier", async () => {
  mockLanguage = "Filipino";
  await render(<RecoverPasswordScreen />);
  expect(screen.getByText("Humiling ng code para sa pag-reset")).toBeTruthy();
  expect(screen.getByLabelText("Email o Login ID ng Account").props.value).toBe("lanlords2025@gmail.com");
  expect(screen.getByText("Ipadala ang Code sa Pag-reset")).toBeTruthy();
  mockLanguage = "English";
});
