import { renderHook } from "@testing-library/react-native";

import { useInterfaceLanguage } from "./useInterfaceLanguage";
import { useUserContext } from "../context/UserContext";

jest.mock("../context/UserContext", () => ({ useUserContext: jest.fn() }));

test("customer and technician interface language follows the saved account preference", async () => {
  const updateLanguage = jest.fn();
  useUserContext.mockReturnValue({ current: { role: "customer", preferences: { language: "English" } }, updateLanguage });
  const { result, rerender } = await renderHook(() => useInterfaceLanguage());
  expect(result.current.t("Work Orders")).toBe("Work Orders");

  useUserContext.mockReturnValue({ current: { role: "technician", preferences: { language: "Filipino" } }, updateLanguage });
  await rerender();
  expect(result.current.t("Work Orders")).toBe("Mga Work Order");
  expect(result.current.t("Service window")).toBe("Panahon ng serbisyo");
  expect(result.current.t("Untranslated original note")).toBe("Untranslated original note");
  expect(result.current.updateLanguage).toBe(updateLanguage);

  useUserContext.mockReturnValue({ current: { role: "technician", preferences: { language: "English" } }, updateLanguage });
  await rerender();
  expect(result.current.t("Work Orders")).toBe("Work Orders");
});
