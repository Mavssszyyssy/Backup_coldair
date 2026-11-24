import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import RegisterProfilePasswordStep from "./RegisterProfilePasswordStep";

vi.mock("../../domain/branches/useActiveBranches", () => ({ default: () => ["Bulacan"] }));
vi.mock("../../config/api", () => ({ apiRequest: vi.fn(async () => ({ available: true })) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function RegistrationProfile() {
  const [formData, setFormData] = useState({ email: "customer@gmail.com", alias: "", password: "", confirmPassword: "" });
  return <RegisterProfilePasswordStep formData={formData} errors={{}}
    onFieldChange={(field, value) => setFormData(previous => ({ ...previous, [field]: value }))}
    detectedRole="customer" onNext={vi.fn()} onCancel={vi.fn()} />;
}

it("leaves username blank without an email-derived placeholder or automatic availability requests", async () => {
  render(<RegistrationProfile />);
  const username = screen.getByLabelText("Username");
  expect(username).toHaveValue("");
  expect(username).not.toHaveAttribute("placeholder");
  fireEvent.blur(username);
  fireEvent.change(username, { target: { value: "my.username" } });
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.blur(username);
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  expect(apiRequest).toHaveBeenCalledWith("/auth/check-alias?alias=my.username", { fresh: true });
  await screen.findByText("Username available");
});

it("does not display availability for an older username after the user edits it", async () => {
  let finishCheck;
  apiRequest.mockImplementationOnce(() => new Promise(resolve => { finishCheck = resolve; }));
  render(<RegistrationProfile />);
  const username = screen.getByLabelText("Username");
  fireEvent.change(username, { target: { value: "first.username" } });
  fireEvent.blur(username);
  fireEvent.change(username, { target: { value: "second.username" } });
  await act(async () => { finishCheck({ available: true }); });
  expect(username).toHaveValue("second.username");
  expect(screen.queryByText("Username available")).not.toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledTimes(1);
});

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
  expect(screen.getByDisplayValue("Maria")).toHaveAttribute("maxlength", "20");
  expect(screen.getByDisplayValue("Santos")).toHaveAttribute("maxlength", "20");
  expect(screen.getByDisplayValue("maria.santos")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /magpatuloy/i })).toBeInTheDocument();
});
