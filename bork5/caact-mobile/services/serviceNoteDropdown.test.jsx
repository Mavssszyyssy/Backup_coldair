import React from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import LogInsertScreen from "../app/technician/task/[id]/unit/log/insert";
import { getTaskById } from "./taskStorage";
import { getLogDraft, getServiceLogById, saveLogDraft, upsertServiceLog } from "./unitServiceLogStorage";
const mockParams = { id: "task1" };
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => mockParams, useFocusEffect: callback => require("react").useEffect(callback, [callback]) }));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: { id: "tech1", name_first: "Test" } }) }));
jest.mock("./taskStorage", () => ({ TASK_STATUS: { IN_PROGRESS: "in-progress" }, getTaskById: jest.fn() }));
jest.mock("./unitServiceLogStorage", () => ({ LOG_TYPES: [{ id: "regular_cleaning", label: "Regular Cleaning" }, { id: "deep_cleaning", label: "Deep Cleaning" }], clearLogDraft: jest.fn(), getLogDraft: jest.fn(), getServiceLogById: jest.fn(), saveLogDraft: jest.fn(), upsertServiceLog: jest.fn() }));
const mount = async mode => render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><LogInsertScreen mode={mode} /></SafeAreaProvider>);
beforeEach(() => {
  jest.clearAllMocks();
  getTaskById.mockResolvedValue({ id: "task1", title: "Maintenance", unitName: "Test AC", status: "in-progress" });
  getLogDraft.mockResolvedValue(null); getServiceLogById.mockResolvedValue(null);
  upsertServiceLog.mockResolvedValue({});
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); delete mockParams.logId; });

test("hours and parts dropdowns, actual costs and written report survive pagination", async () => {
  await mount(); await screen.findByText("Test AC");
  await fireEvent.press(screen.getByLabelText("Select Hours Worked"));
  await fireEvent.press(screen.getByLabelText("Hours Worked: 2.5"));
  await fireEvent.press(screen.getByLabelText("Select Parts Used"));
  await fireEvent.press(screen.getByLabelText("Parts Used: Filter"));
  await fireEvent.changeText(screen.getByLabelText("Labor cost (PHP)"), "200");
  await fireEvent.changeText(screen.getByLabelText("Parts cost (PHP)"), "50");
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  await fireEvent.press(screen.getByLabelText("Select Technician Findings"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Dust buildup on the air filter."));
  await fireEvent.press(screen.getByLabelText("Select Work Performed"));
  await fireEvent.press(screen.getByLabelText("Work Performed: Cleaned the air filter."));
  await fireEvent.press(screen.getByLabelText("Service note: Previous page"));
  expect(screen.getByLabelText("Labor cost (PHP)").props.value).toBe("200");
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  await fireEvent.press(screen.getByText("Save Service Note"));
  await waitFor(() => expect(upsertServiceLog).toHaveBeenCalledWith(expect.objectContaining({ hoursSpent: 2.5, partsUsed: "Filter", laborCost: 200, partsCost: 50 })));
});

test("direct Add Service Note offers cleaning dropdowns, rejects blank report, and saves selected sentences", async () => {
  await mount(); await screen.findByText("Test AC");
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  expect(upsertServiceLog).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Select Technician Findings"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Dust buildup on the air filter."));
  await fireEvent.press(screen.getByLabelText("Select Work Performed"));
  await fireEvent.press(screen.getByLabelText("Work Performed: Cleaned the air filter."));
  await fireEvent.press(screen.getByLabelText("Work Performed: Flushed the drain line."));
  await fireEvent.changeText(screen.getByLabelText("Additional Notes (Optional)"), "Keep the inlet clear.");
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  await fireEvent.press(screen.getByText("Save Service Note"));
  await waitFor(() => expect(upsertServiceLog).toHaveBeenCalledWith(expect.objectContaining({ logType: "regular_cleaning", findings: "Dust buildup on the air filter.", resolution: "Cleaned the air filter.\nFlushed the drain line.", notes: "Keep the inlet clear." })));
});

test("draft custom findings and deep-cleaning method survive a save and reopen", async () => {
  getLogDraft.mockResolvedValue({ logType: "deep_cleaning", findings: "Existing custom coil observation.", resolution: "Removed and disassembled the indoor unit for deep cleaning.", notes: "Saved advice." });
  await mount(); await screen.findByText("Test AC");
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  expect(screen.getByLabelText("Other technician findings").props.value).toBe("Existing custom coil observation.");
  await fireEvent.press(screen.getByLabelText("Select Work Performed"));
  expect(screen.getByLabelText("Work Performed: Removed and disassembled the indoor unit for deep cleaning.").props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByText("Save Draft"));
  expect(saveLogDraft).toHaveBeenCalledWith("task1", expect.objectContaining({ logType: "deep_cleaning", findings: "Existing custom coil observation.", notes: "Saved advice." }));
});

test("editing an existing note preserves custom text and reports failed saves without clearing it", async () => {
  mockParams.logId = "log1";
  getServiceLogById.mockResolvedValue({ logType: "regular_cleaning", findings: "Existing custom observation.", resolution: "Cleaned the air filter." });
  upsertServiceLog.mockRejectedValue(new Error("Connection interrupted"));
  await mount("update"); await screen.findByText("Test AC");
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  await fireEvent.press(screen.getByLabelText("Service note: Next page"));
  await fireEvent.press(screen.getByText("Save Service Note"));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Service note not saved", "Connection interrupted"));
  await fireEvent.press(screen.getByLabelText("Service note: Previous page"));
  expect(screen.getByLabelText("Other technician findings").props.value).toBe("Existing custom observation.");
});
