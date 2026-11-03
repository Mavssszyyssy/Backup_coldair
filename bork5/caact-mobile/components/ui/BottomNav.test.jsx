import React from "react";
import { render, screen } from "@testing-library/react-native";
import BottomNav from "./BottomNav";

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/customer/settings",
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock("../../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ t: (value) => value }) }));

test("customer bottom navigation keeps the account tab and readable labels", async () => {
  await render(<BottomNav />);
  expect(screen.getByRole("tab", { name: "Account" }).props.accessibilityState.selected).toBe(true);
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  expect(screen.getByText("Services").props.numberOfLines).toBe(2);
});
