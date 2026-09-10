import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ApplicationErrorBoundary from "./ApplicationErrorBoundary";

const BrokenScreen = () => {
  throw new Error("route failed");
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
it("replaces a route crash with a visible recovery action", () => {
  render(<ApplicationErrorBoundary><BrokenScreen /></ApplicationErrorBoundary>);

  expect(screen.getByRole("heading", { name: "This screen could not open" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reload screen" })).toBeInTheDocument();
  expect(screen.getByText(/saved records are not affected/i)).toBeInTheDocument();
});
