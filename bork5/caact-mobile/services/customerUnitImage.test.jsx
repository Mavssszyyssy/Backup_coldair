import React from "react";
import { render, screen } from "@testing-library/react-native";
import CustomerUnitImage from "../components/customer/CustomerUnitImage";
import { getProductImageAssetKey } from "./ecommerceService";

test("registered units use the packaged catalog photo when no server photo is available", async () => {
  await render(<CustomerUnitImage unit={{ brand: "Samsung", model: "Digital Inverter 1.5HP", unitName: "Samsung Digital Inverter 1.5HP" }} />);

  expect(screen.getByLabelText("Samsung Digital Inverter 1.5HP catalog photo")).toBeTruthy();
  expect(getProductImageAssetKey({ brand: "Samsung", name: "Digital Inverter 1.5HP" })).toBe("samsung-ar9500t.png");
});
