import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import CalendarDatePicker from "./CalendarDatePicker";

jest.mock("../../hooks/useInterfaceLanguage", () => ({
  useInterfaceLanguage: () => ({
    language: "Filipino",
    t: value => require("../../services/interfaceI18n").translateText(value, "Filipino"),
  }),
}));

test("localizes the date picker without changing the selected date key", async () => {
  const onChange = jest.fn();
  await render(<CalendarDatePicker label="Preferred Date" value="" minimumDate="2099-01-01" onChange={onChange} />);
  expect(screen.getByText("Nais na Petsa")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /pumili ng petsa/i }));
  expect(screen.getByText("Hindi maaaring pumili ng mga nakaraang petsa.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "2099-01-01" }));
  expect(onChange).toHaveBeenCalledWith("2099-01-01");
});
