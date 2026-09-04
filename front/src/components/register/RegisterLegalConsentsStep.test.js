import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RegisterLegalConsentsStep from "./RegisterLegalConsentsStep";

const emptyConsents = {
  agreeTermsWarranty: false,
  agreeTermsService: false,
  agreeTermsApp: false,
  agreePrivacyRa10173: false,
};

describe("registration legal consents", () => {
  it("links each required consent to its own legal document", () => {
    render(
      <RegisterLegalConsentsStep
        formData={emptyConsents}
        errors={{}}
        onFieldChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const links = screen.getAllByRole("link", { name: /read .* in a new tab/i });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/terms/warranty",
      "/terms/service",
      "/terms/app",
      "/privacy",
    ]);
  });

  it("shows specific errors and blocks progress when policies are missing", () => {
    const onNext = vi.fn();
    render(
      <RegisterLegalConsentsStep
        formData={emptyConsents}
        errors={{}}
        onFieldChange={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onNext).not.toHaveBeenCalled();
    expect(
      screen.getByText(/please accept 4 remaining required policies/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")[0]).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getAllByRole("checkbox")[0]).toHaveAttribute(
      "aria-describedby",
      "legal-consent-summary",
    );
  });

  it("continues after every required policy is accepted", () => {
    const onNext = vi.fn();
    render(
      <RegisterLegalConsentsStep
        formData={Object.fromEntries(
          Object.keys(emptyConsents).map((key) => [key, true]),
        )}
        errors={{}}
        onFieldChange={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});
