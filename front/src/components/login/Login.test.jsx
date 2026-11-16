import { Eye, EyeSlash } from "@phosphor-icons/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Login from "./Login";

const login = vi.fn();
const verifyLoginEmail = vi.fn();
const resendLoginEmail = vi.fn();
let currentLanguage;

vi.mock("../../context/UserContext", () => ({
  useUser: () => ({ login, verifyLoginEmail, resendLoginEmail, currentLanguage }),
}));

beforeEach(() => {
  sessionStorage.clear();
  currentLanguage = "English";
  login.mockReset();
  verifyLoginEmail.mockReset();
  resendLoginEmail.mockReset();
  login.mockResolvedValue({
    requiresEmailVerification: true,
    challengeToken: "challenge-1",
    maskedEmail: "m***@example.com",
  });
});

afterEach(() => vi.useRealTimers());

it("provides one password visibility control and preserves the input value when toggled", () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  const password = screen.getByLabelText("Password");
  fireEvent.change(password, { target: { value: "StrongPass1." } });
  const show = screen.getByRole("button", { name: "Show password" });
  const hiddenIcon = render(<EyeSlash size={20} weight="bold" aria-hidden="true" />).container.firstChild;
  const visibleIcon = render(<Eye size={20} weight="bold" aria-hidden="true" />).container.firstChild;
  expect(password).toHaveAttribute("type", "password");
  expect(show).toHaveAttribute("aria-controls", password.id);
  expect(show.firstChild.isEqualNode(hiddenIcon)).toBe(true);
  fireEvent.click(show);
  expect(password).toHaveAttribute("type", "text");
  expect(password).toHaveValue("StrongPass1.");
  const hide = screen.getByRole("button", { name: "Hide password" });
  expect(hide.firstChild.isEqualNode(visibleIcon)).toBe(true);
  fireEvent.click(hide);
  expect(password).toHaveAttribute("type", "password");
});

it("places the keyboard-accessible reset link below the password and removes the technical panel", () => {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<h1>Password recovery</h1>} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByLabelText("Sign-in alias or email")).toHaveAttribute("autocomplete", "username");
  expect(screen.queryByText("Boutique Security")).not.toBeInTheDocument();

  const reset = screen.getByRole("link", { name: "Reset password" });
  expect(reset).toHaveAttribute("href", "/forgot-password");
  screen.getByLabelText("Password").focus();
  userEvent.tab();
  expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus();
  userEvent.tab();
  expect(reset).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole("button", { name: "Sign in" })).toHaveFocus();
  reset.focus();
  userEvent.keyboard("{Enter}");
  expect(screen.getByRole("heading", { name: "Password recovery" })).toBeInTheDocument();
});

it("localizes the updated login text in Filipino", () => {
  currentLanguage = "Filipino";
  render(<MemoryRouter><Login /></MemoryRouter>);
  expect(screen.getByLabelText("Alias o email sa pag-sign in")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "I-reset ang password" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mag-sign in" })).toBeEnabled();
});

it("provides the original icon-only Back to Home link with an accessible name", () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  const back = screen.getByRole("link", { name: "Back to Home" });
  expect(back).toHaveAttribute("href", "/home");
  expect(back.textContent).toBe("");
  expect(back.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

it("keeps polished secondary actions when the login form switches to email verification", async () => {
  render(<MemoryRouter><Login /></MemoryRouter>);

  fireEvent.change(screen.getByLabelText("Sign-in alias or email"), { target: { value: "admin.cavite" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "StrongPass1." } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => expect(login).toHaveBeenCalledWith("admin.cavite", "StrongPass1."));
  expect(await screen.findByRole("button", { name: "Resend code" })).toHaveClass("bq-auth-action--outline");
  expect(screen.getByRole("button", { name: "Use a different account" })).toHaveClass("bq-auth-action--ghost");
  expect(document.querySelector(".bq-auth-secondary-actions")).toBeInTheDocument();
});

it("keeps the sign-in form usable after rejected credentials", async () => {
  login.mockRejectedValueOnce(new Error("Invalid credentials"));
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Sign-in alias or email"), { target: { value: "wrong.role" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "WrongPassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  expect(screen.getByLabelText("Sign-in alias or email")).toBeEnabled();
});

it("shows the lockout immediately, restores its countdown on reload, and enables sign-in when it ends", async () => {
  vi.useFakeTimers();
  login.mockRejectedValueOnce(Object.assign(new Error("Too many failed attempts. Try again later."), {
    status: 429,
    data: { code: "LOGIN_LOCKED", retryAfterSeconds: 60 },
  }));
  const page = render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Sign-in alias or email"), { target: { value: "name@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "WrongPassword1!" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign in" })); });

  expect(screen.getByRole("timer")).toHaveTextContent("1:00");
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
  expect(screen.getByLabelText("Password")).toHaveValue("");
  expect(screen.getByRole("link", { name: "Reset password" })).toBeVisible();
  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).form);
  expect(login).toHaveBeenCalledTimes(1);

  page.unmount();
  act(() => { vi.advanceTimersByTime(1000); });
  render(<MemoryRouter><Login /></MemoryRouter>);
  expect(screen.getByRole("timer")).toHaveTextContent("0:59");
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();

  const identifier = screen.getByLabelText("Sign-in alias or email");
  fireEvent.change(identifier, { target: { value: "different.user" } });
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  fireEvent.change(identifier, { target: { value: "NAME@example.com" } });
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  act(() => { vi.advanceTimersByTime(59_000); });
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

it("displays the verification resend countdown without requiring a failed resend", async () => {
  vi.useFakeTimers();
  login.mockResolvedValueOnce({
    requiresEmailVerification: true,
    challengeToken: "challenge-2",
    resendAvailableAt: new Date(Date.now() + 3000).toISOString(),
  });
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Sign-in alias or email"), { target: { value: "admin.cavite" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "StrongPass1." } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign in" })); });
  expect(screen.getByRole("button", { name: /Resend code/ })).toBeDisabled();
  expect(screen.getByRole("timer")).toHaveTextContent("0:03");
  expect(resendLoginEmail).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
});
