import React from "react";
import { render, screen } from "@testing-library/react-native";
import TechnicianBottomNav from "./TechnicianBottomNav";

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/technician/dashboard",
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock("../../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ t: (value) => value }) }));
jest.mock("../NotificationBadge", () => () => null);

test("technician bottom navigation names the dashboard consistently", async () => {
  await render(<TechnicianBottomNav />);
  expect(screen.getByRole("tab", { name: "Dashboard" }).props.accessibilityState.selected).toBe(true);
  expect(screen.queryByRole("tab", { name: "Today" })).toBeNull();
  expect(screen.getByRole("tab", { name: "Account" })).toBeTruthy();
  expect(screen.queryByRole("tab", { name: "Profile" })).toBeNull();
});
