import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import CustomerHomeScreen from "../app/customer/home";
import { getUnitsByUser } from "./unitStorage";

const mockPush = jest.fn();
const mockCurrent = { id: "owner", name: "Customer" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback) => require("react").useEffect(callback, [callback]),
}));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: mockCurrent }) }));
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ t: (text) => text, language: "English" }) }));
jest.mock("./unitStorage", () => ({ getUnitsByUser: jest.fn() }));
jest.mock("./orderStorage", () => ({ getOrdersByUser: jest.fn(async () => []) }));
jest.mock("./liveRefresh", () => ({ startLiveRefresh: (load) => { void load(); return () => {}; } }));
jest.mock("./maintenanceRecommendationService", () => ({ buildUnitRecommendationMap: () => ({}), buildNextRecommendedMaintenance: () => null }));
jest.mock("../components/customer/CustomerHeaderActions", () => () => null);
jest.mock("../components/customer/CustomerScreen", () => ({ children }) => {
  const { View } = require("react-native");
  return <View>{children}</View>;
});
jest.mock("../components/customer/CustomerUnitRow", () => ({ unit, onPress }) => {
  const { Pressable, Text } = require("react-native");
  return <Pressable accessibilityLabel={`Open ${unit.unitName}`} onPress={onPress}><Text>{unit.unitName}</Text></Pressable>;
});

test("search keeps the matching AC identity and opens its own details", async () => {
  mockPush.mockClear();
  getUnitsByUser.mockResolvedValue([
    { id: "ac-one", unitName: "Bedroom AC", installationAddress: "Makati", serviceHistory: [{ id: "service-one" }] },
    { id: "ac-two", unitName: "Office AC", installationAddress: "Bacoor", serviceHistory: [{ id: "service-two" }] },
  ]);
  const view = await render(<CustomerHomeScreen />);
  await view.findByText("Office AC");
  await act(async () => fireEvent.changeText(view.getByLabelText("Search registered AC units"), "Bacoor"));
  expect(view.queryByText("Bedroom AC")).toBeNull();
  fireEvent.press(view.getByLabelText("Open Office AC"));
  expect(mockPush).toHaveBeenCalledWith("/customer/units/ac-two");
  await act(async () => fireEvent.changeText(view.getByLabelText("Search registered AC units"), "missing"));
  expect(view.getByText("No matching AC unit")).toBeTruthy();
  view.unmount();
});
