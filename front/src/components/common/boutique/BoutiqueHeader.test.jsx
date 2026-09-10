import { fireEvent, render, screen } from "@testing-library/react";
import BoutiqueHeader from "./BoutiqueHeader";

test("customer header hides a cart control when the page has no cart action", () => {
  render(<BoutiqueHeader title="Settings" onLeftAction={() => {}} />);
  expect(screen.queryByRole("button", { name: "Open cart" })).not.toBeInTheDocument();
});

test("customer header preserves the functional cart action", () => {
  const onCartClick = vi.fn();
  render(<BoutiqueHeader title="Shop" onLeftAction={() => {}} onCartClick={onCartClick} cartCount={2} />);
  fireEvent.click(screen.getByRole("button", { name: "Open cart" }));
  expect(onCartClick).toHaveBeenCalledTimes(1);
  expect(screen.getByText("2")).toBeInTheDocument();
});
