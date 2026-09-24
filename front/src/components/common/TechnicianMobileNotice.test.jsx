import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import TechnicianMobileNotice from "./TechnicianMobileNotice";
import { useUser } from "../../context/UserContext";

vi.mock("../../context/UserContext", () => ({ useUser: vi.fn() }));

beforeEach(() => {
  useUser.mockReturnValue({
    isAuthenticated: true,
    logout: vi.fn(),
    changePassword: vi.fn(),
    resetAuthenticator: vi.fn(),
    user: {
      name_first: "Carl",
      name_last: "Technician",
      alias: "tech.cavite.carl",
      email: "carl@example.com",
      phone: "09123456789",
      assignedBranch: "Cavite",
      authProvider: "local",
      security: { totpEnabled: true },
    },
  });
});

test("retired technician web workspace still exposes only account and security management", () => {
  render(<MemoryRouter><TechnicianMobileNotice /></MemoryRouter>);
  expect(screen.getByText("Technician Account Management")).toBeInTheDocument();
  expect(screen.getByText(/tech\.cavite\.carl/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Change / Reset Authenticator" })).toBeInTheDocument();
  expect(screen.getByText(/Work orders remain mobile-only/)).toBeInTheDocument();
});

test("shows a clear completion message after recovery codes are saved", () => {
  render(<MemoryRouter initialEntries={[{ pathname: "/technician-mobile", state: { authenticatorSetupComplete: true } }]}><TechnicianMobileNotice /></MemoryRouter>);
  expect(screen.getByRole("status")).toHaveTextContent("Authenticator setup completed. Your account is protected.");
});
