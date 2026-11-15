import { fireEvent, render, screen } from "@testing-library/react-native";
import { Keyboard } from "react-native";

import BottomSheetSelect from "./BottomSheetSelect";
import { translateText } from "../../services/interfaceI18n";

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
  }, 20000);

  test("localizes shared selection controls without changing option values", async () => {
    const onSelect = jest.fn();
    const province = { code: "03", name: "Bulacan" };
    const translate = (text) => translateText(text, "Filipino");
    await render(<BottomSheetSelect label="Lalawigan" placeholder="Pumili ng lalawigan" items={[province]} onSelect={onSelect} translate={translate} />);
    await fireEvent.press(screen.getByText("Pumili ng lalawigan"));
    expect(screen.getByText("Pumili ng Lalawigan")).toBeTruthy();
    expect(screen.getByPlaceholderText("Maghanap ng lalawigan")).toBeTruthy();
    await fireEvent.press(screen.getByText("Bulacan"));
    expect(onSelect).toHaveBeenCalledWith(province);
  });

  test("matches accents and identifiers, clearing the query after the picker closes", async () => {
    const first = { id: "unit-101", name: "José AC" };
    await render(<BottomSheetSelect label="AC unit" placeholder="Select unit" items={[first, { id: "unit-102", name: "Other AC" }]} />);
    await fireEvent.press(screen.getByText("Select unit"));
    await fireEvent.changeText(screen.getByLabelText("Search for ac unit"), "101 JOSE");
    expect(screen.getByText("José AC")).toBeTruthy();
    expect(screen.queryByText("Other AC")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search for ac unit"), "no results");
    expect(screen.getByText("No matching records found.")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Close"));
    await fireEvent.press(screen.getByText("Select unit"));
    expect(screen.getByLabelText("Search for ac unit").props.value).toBe("");
  });
});
