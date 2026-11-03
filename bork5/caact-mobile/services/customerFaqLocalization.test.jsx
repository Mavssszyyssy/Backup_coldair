import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import CustomerFaqScreen from "../app/customer/faq";

let mockLanguage = "Filipino";
jest.mock("../hooks/useInterfaceLanguage", () => ({
  useInterfaceLanguage: () => ({ t: (text) => require("./interfaceI18n").translateText(text, mockLanguage) }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("../components/customer/CustomerScreen", () => {
  const { Text } = require("react-native");
  return { __esModule: true, default: ({ children, title }) => <><Text>{title}</Text>{children}</> };
});

test("customer FAQ searches the displayed Filipino questions and can switch back to English", async () => {
  mockLanguage = "Filipino";
  const view = await render(<CustomerFaqScreen />);
  expect(screen.getByText("Mga Madalas Itanong at Tulong")).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText("Maghanap tungkol sa delivery, warranty, bayad..."), "paano ako o-order");
  expect(screen.getByText("Paano ako o-order ng AC unit?")).toBeTruthy();
  view.unmount();

  mockLanguage = "English";
  await render(<CustomerFaqScreen />);
  expect(screen.getByText("FAQ & Help")).toBeTruthy();
  expect(screen.getByText("How do I place an AC unit order?")).toBeTruthy();
});
