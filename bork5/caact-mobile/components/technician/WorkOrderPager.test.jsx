import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import WorkOrderPager from "./WorkOrderPager";

jest.mock("../../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ language: "English", t: (value) => value }) }));

const pages = [
  { key: "overview", label: "Overview" },
  { key: "unit", label: "AC Unit" },
  { key: "proof", label: "Proof" },
];

test("work-order pager separates progress from accessible navigation controls", async () => {
  const onChange = jest.fn();
  const view = await render(<WorkOrderPager pages={pages} currentPage={0} onChange={onChange} />);
  expect(screen.getByText("Step 1 of 3 · Overview")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Previous" }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  expect(onChange).toHaveBeenCalledWith(1);
  await view.rerender(<WorkOrderPager pages={pages} currentPage={2} onChange={onChange} />);
  expect(screen.getByRole("button", { name: "Next" }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Previous" }));
  expect(onChange).toHaveBeenLastCalledWith(1);
});
