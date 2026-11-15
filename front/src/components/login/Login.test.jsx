import { Eye, EyeSlash } from "@phosphor-icons/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import Login from "./Login";

const login = vi.fn();
const verifyLoginEmail = vi.fn();
const resendLoginEmail = vi.fn();
let currentLanguage;

vi.mock("../../context/UserContext", () => ({
  useUser: () => ({ login, verifyLoginEmail, resendLoginEmail, currentLanguage }),
}));

beforeEach(() => {
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
  expect(screen.getByLabelText("Sign-in alias")).toHaveAttribute("autocomplete", "username");
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
  expect(screen.getByLabelText("Alias sa pag-sign in")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "I-reset ang password" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mag-sign in" })).toBeEnabled();
});

it("keeps polished secondary actions when the login form switches to email verification", async () => {
  render(<MemoryRouter><Login /></MemoryRouter>);

  fireEvent.change(screen.getByLabelText("Sign-in alias"), { target: { value: "admin.cavite" } });
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
  fireEvent.change(screen.getByLabelText("Sign-in alias"), { target: { value: "wrong.role" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "WrongPassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  expect(screen.getByLabelText("Sign-in alias")).toBeEnabled();
});
