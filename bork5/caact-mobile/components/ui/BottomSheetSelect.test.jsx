import { fireEvent, render, screen } from "@testing-library/react-native";
import { Keyboard } from "react-native";

import BottomSheetSelect from "./BottomSheetSelect";

describe("BottomSheetSelect keyboard lifecycle", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("dismisses the search keyboard before applying a selected address option", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
    const onSelect = jest.fn();
    const barangay = { code: "1376050142", name: "Barangay 142" };
    await render(
      <BottomSheetSelect
        label="Barangay or district"
        value=""
        placeholder="Select barangay"
        searchPlaceholder="Search barangay or district"
        items={[barangay]}
        onSelect={onSelect}
      />,
    );

    await fireEvent.press(screen.getByText("Select barangay"));
    await fireEvent.changeText(
      screen.getByPlaceholderText("Search barangay or district"),
      "142",
    );
    await fireEvent.press(screen.getByText("Barangay 142"));

    expect(dismissSpy).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith(barangay);
    expect(screen.queryByPlaceholderText("Search barangay or district")).toBeNull();
  });
});
