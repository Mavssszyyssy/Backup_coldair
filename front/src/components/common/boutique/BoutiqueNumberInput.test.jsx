import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import BoutiqueNumberInput from "./BoutiqueNumberInput";

function PriceField() {
  const [price, setPrice] = useState(100000);
  return <BoutiqueNumberInput value={price} onChange={setPrice} min={50000} max={100000}
    step={1000} ariaLabel="Max Price" commitOnBlur />;
}

test("bounded price input rejects oversized and malformed amounts and clamps the committed value", () => {
  render(<PriceField />);
  const field = screen.getByRole("textbox", { name: "Max Price" });
  expect(screen.getByRole("button", { name: "Increase Max Price" })).toBeDisabled();
  fireEvent.change(field, { target: { value: "100000000" } });
  expect(field).toHaveValue("100,000");
  fireEvent.change(field, { target: { value: "9e4" } });
  expect(field).toHaveValue("100,000");
  fireEvent.change(field, { target: { value: "25000" } });
  fireEvent.blur(field);
  expect(field).toHaveValue("50,000");
  expect(screen.getByRole("button", { name: "Decrease Max Price" })).toBeDisabled();
  fireEvent.change(field, { target: { value: "99400" } });
  fireEvent.keyDown(field, { key: "ArrowUp" });
  expect(field).toHaveValue("100,000");
});
