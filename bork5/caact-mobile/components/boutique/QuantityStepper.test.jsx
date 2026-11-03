import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { BoutiqueQuantityStepper } from "./index";

test("quantity controls stop at one and the branch stock limit", async () => {
  const onChange = jest.fn();
  const view = await render(<BoutiqueQuantityStepper value={1} max={2} onChange={onChange} />);
  await fireEvent.press(view.getByLabelText("Decrease quantity"));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(view.getByLabelText("Increase quantity"));
  expect(onChange).toHaveBeenCalledWith(2);

  onChange.mockClear();
  await screen.rerender(<BoutiqueQuantityStepper value={2} max={2} onChange={onChange} />);
  await fireEvent.press(screen.getByLabelText("Increase quantity"));
  expect(onChange).not.toHaveBeenCalled();

  await screen.rerender(<BoutiqueQuantityStepper value={1} max={0} onChange={onChange} />);
  await fireEvent.press(screen.getByLabelText("Increase quantity"));
  expect(onChange).not.toHaveBeenCalled();

  await screen.rerender(<BoutiqueQuantityStepper value={2} max={5} disabled onChange={onChange} />);
  await fireEvent.press(screen.getByTestId("quantity-decrease"));
  await fireEvent.press(screen.getByTestId("quantity-increase"));
  expect(onChange).not.toHaveBeenCalled();
});
