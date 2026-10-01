import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BoutiqueButton from "./BoutiqueButton";
import BoutiquePageContainer from "./BoutiquePageContainer";
import BoutiqueSectionHeader from "./BoutiqueSectionHeader";
import BoutiqueTextarea from "./BoutiqueTextarea";

describe("Boutique foundation primitives", () => {
  it("connects buttons to the shared AEROPULSE component classes", () => {
    render(<BoutiqueButton variant="outline">Continue</BoutiqueButton>);

    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass(
      "ap-button",
      "ap-button--outline",
      "bq-btn",
    );
  });

  it("renders an accessible shared textarea error", () => {
    render(
      <BoutiqueTextarea
        label="Work details"
        name="workDetails"
        status="error"
        errorMessage="Work details are required."
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Work details" });
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAccessibleDescription("Work details are required.");
  });

  it("provides page and section structure for future migrations", () => {
    render(
      <BoutiquePageContainer>
        <BoutiqueSectionHeader title="Inventory" description="Review available units." />
      </BoutiquePageContainer>,
    );

    expect(screen.getByText("Inventory").closest("header")).toHaveClass("ap-section-header");
    expect(screen.getByText("Review available units.").closest(".ap-page-container")).toHaveClass(
      "ap-page-container",
    );
  });
});
