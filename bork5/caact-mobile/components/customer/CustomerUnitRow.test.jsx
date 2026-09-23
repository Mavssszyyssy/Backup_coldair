import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import CustomerUnitRow from "./CustomerUnitRow";

jest.mock("./CustomerUnitImage", () => () => null);

test("keeps secondary AC details compact until View More is pressed", async () => {
  await render(<CustomerUnitRow
    unit={{ unitName: "Bedroom AC", brand: "LG", productSku: "HSN24", serialNumber: "SERIAL-1", orderCode: "ORD-1" }}
    position={1}
    onPress={jest.fn()}
  />);

  expect(screen.queryByText("Serial: SERIAL-1")).toBeNull();
  await fireEvent.press(screen.getByText("View More"));
  expect(screen.getByText("Serial: SERIAL-1")).toBeTruthy();
  expect(screen.getByText("View Less")).toBeTruthy();
});
