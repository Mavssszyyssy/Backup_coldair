import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import Login from "./Login";

const login = vi.fn();
const verifyLoginEmail = vi.fn();
const resendLoginEmail = vi.fn();

vi.mock("../../context/UserContext", () => ({
  useUser: () => ({ login, verifyLoginEmail, resendLoginEmail }),
}));

beforeEach(() => {
  login.mockReset();
  verifyLoginEmail.mockReset();
  resendLoginEmail.mockReset();
  login.mockResolvedValue({
    requiresEmailVerification: true,
    challengeToken: "challenge-1",
    maskedEmail: "m***@example.com",
  });
});

it("keeps polished secondary actions when the login form switches to email verification", async () => {
  render(<MemoryRouter><Login /></MemoryRouter>);

  expect(screen.getByRole("button", { name: "Reset Password" })).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("juan.dc"), { target: { value: "admin.cavite" } });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "StrongPass1." } });
  fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

  await waitFor(() => expect(login).toHaveBeenCalledWith("admin.cavite", "StrongPass1."));
  expect(await screen.findByRole("button", { name: "Resend code" })).toHaveClass("bq-auth-action--outline");
  expect(screen.getByRole("button", { name: "Use a different account" })).toHaveClass("bq-auth-action--ghost");
  expect(document.querySelector(".bq-auth-secondary-actions")).toBeInTheDocument();
});
