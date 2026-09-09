import { upsertServiceLog } from "./unitServiceLogStorage";
import * as api from "./api";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("./api", () => ({ getStoredToken: jest.fn(async () => "test-session"), fetchTask: jest.fn(async () => ({ success: true, task: { serviceLogs: [] } })), patchTask: jest.fn(async () => ({ success: true, task: {} })) }));
test("dropdown sentences reach the API as individual actions with the existing report format", async () => {
  await upsertServiceLog({ taskId: "task1", logType: "deep_cleaning", findings: "Dust buildup on the evaporator coil.", resolution: "Removed and disassembled the indoor unit for deep cleaning.\nCleaned the evaporator coil.", notes: "Customer advice." });
  expect(api.patchTask).toHaveBeenCalledWith("test-session", "task1", expect.objectContaining({ serviceType: "deep_cleaning", findings: "Dust buildup on the evaporator coil.", serviceActions: ["Removed and disassembled the indoor unit for deep cleaning.", "Cleaned the evaporator coil."], notes: "Customer advice." }));
});
