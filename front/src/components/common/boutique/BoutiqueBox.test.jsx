import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueText from "./BoutiqueText";

it("applies its color to inherited text instead of emitting an ineffective HTML color attribute", () => {
  render(
    <BoutiqueBox color="white" background="black">
      <BoutiqueText>Default</BoutiqueText>
    </BoutiqueBox>,
  );

  const box = screen.getByText("Default").parentElement;
  expect(box).toHaveStyle({ background: "black", color: "white" });
  expect(box).not.toHaveAttribute("color");
});
