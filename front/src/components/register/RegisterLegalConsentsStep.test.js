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
  it("localizes consent controls in Filipino while retaining consent IDs", () => {
    const onFieldChange = vi.fn();
    render(
      <RegisterLegalConsentsStep
        currentLanguage="Filipino"
        formData={emptyConsents}
        errors={{}}
        onFieldChange={onFieldChange}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("Mga Tuntunin at Pagkapribado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /suriin.*warranty/i }));
    fireEvent.click(screen.getByRole("button", { name: /tapusin ang pagsusuri/i }));
    expect(onFieldChange).toHaveBeenCalledWith("agreeTermsWarranty", true);
  });

  it("reviews each required consent on the current page", () => {
    const onFieldChange = vi.fn();
    render(
      <RegisterLegalConsentsStep
        formData={emptyConsents}
        errors={{}}
        onFieldChange={onFieldChange}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const reviewButtons = screen.getAllByRole("button", { name: /review .*terms|review .*privacy/i });
    fireEvent.click(reviewButtons[0]);
    expect(
      screen.getByRole("dialog", { name: /warranty terms and conditions/i }),
    ).toBeInTheDocument();
    expect(onFieldChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /finish review/i }));
    expect(onFieldChange).toHaveBeenCalledWith("agreeTermsWarranty", true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
