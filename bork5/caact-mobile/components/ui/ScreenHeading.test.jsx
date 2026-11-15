import React from "react";
import { render, screen } from "@testing-library/react-native";
import ScreenHeading from "./ScreenHeading";

test("announces the screen heading and lets long localized text wrap", async () => {
  const title = "Mga detalye ng kahilingan sa maintenance";
  const subtitle = "Suriin ang mga nakaraang pagbisita at iskedyul para sa iyong air conditioner.";
  await render(<ScreenHeading title={title} subtitle={subtitle} />);

  const heading = screen.getByRole("header", { name: title });
  const description = screen.getByText(subtitle);
  expect(heading).toHaveStyle({ fontSize: 22, lineHeight: 28 });
  expect(description).toHaveStyle({ fontSize: 13, lineHeight: 18 });
  expect(heading.props.numberOfLines).toBeUndefined();
  expect(description.props.numberOfLines).toBeUndefined();
});
