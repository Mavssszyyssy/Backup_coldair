import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import BoutiqueDrawer from "./BoutiqueDrawer";

test("names the drawer and close control and restores keyboard focus", () => {
  const onClose = vi.fn();
  const { rerender } = render(<><button type="button">Open cart</button><BoutiqueDrawer isOpen={false} onClose={onClose} title="Your Cart">Cart contents</BoutiqueDrawer></>);
  const trigger = screen.getByRole("button", { name: "Open cart" });
  trigger.focus();
  rerender(<><button type="button">Open cart</button><BoutiqueDrawer isOpen onClose={onClose} title="Your Cart">Cart contents</BoutiqueDrawer></>);
  expect(screen.getByRole("dialog", { name: "Your Cart" })).toBeInTheDocument();
  const close = screen.getByRole("button", { name: "Close Your Cart" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
  rerender(<><button type="button">Open cart</button><BoutiqueDrawer isOpen={false} onClose={onClose} title="Your Cart">Cart contents</BoutiqueDrawer></>);
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
