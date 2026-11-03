import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import ProofPhotoList from "./ProofPhotoList";

jest.mock("../../hooks/useInterfaceLanguage", () => ({
  useInterfaceLanguage: () => ({ language: "English", t: (value) => value }),
}));

test("technician can enlarge and close a work-order photo", async () => {
  const view = await render(<ProofPhotoList photos={[{ uri: "https://example.test/proof.jpg", label: "After repair" }]} />);
  expect(view.getByText("After repair")).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: "View photo 1" }));
  expect(view.getByRole("button", { name: "Close photo" })).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: "Close photo" }));
  expect(view.queryByRole("button", { name: "Close photo" })).toBeNull();
});
