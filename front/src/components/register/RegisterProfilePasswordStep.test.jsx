import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import RegisterProfilePasswordStep from "./RegisterProfilePasswordStep";

vi.mock("../../domain/branches/useActiveBranches", () => ({ default: () => ["Bulacan"] }));
vi.mock("../../config/api", () => ({ apiRequest: vi.fn(async () => ({ available: true })) }));

it("localizes profile controls without translating account data", () => {
  render(
    <RegisterProfilePasswordStep
      currentLanguage="Filipino"
      formData={{ email: "customer@gmail.com", firstName: "Maria", lastName: "Santos", alias: "maria.santos", password: "", confirmPassword: "" }}
      errors={{}}
      onFieldChange={vi.fn()}
      detectedRole="customer"
      onNext={vi.fn()}
      onCancel={vi.fn()}
    />,
  );

  expect(screen.getByText("Profile at Seguridad")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Maria")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Maria")).toHaveAttribute("maxlength", "30");
  expect(screen.getByDisplayValue("Santos")).toHaveAttribute("maxlength", "30");
  expect(screen.getByDisplayValue("maria.santos")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /magpatuloy/i })).toBeInTheDocument();
});
