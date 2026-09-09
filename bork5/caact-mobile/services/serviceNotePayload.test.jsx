import { upsertServiceLog, getServiceLogsByTask, deleteServiceLog } from "./unitServiceLogStorage";
import * as api from "./api";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("./api", () => ({ getStoredToken: jest.fn(async () => "test-session"), fetchTask: jest.fn(async () => ({ success: true, task: { serviceLogs: [] } })), patchTask: jest.fn(async () => ({ success: true, task: {} })) }));
test("dropdown sentences reach the API as individual actions with the existing report format", async () => {
  await upsertServiceLog({ taskId: "task1", logType: "deep_cleaning", findings: "Dust buildup on the evaporator coil.", resolution: "Removed and disassembled the indoor unit for deep cleaning.\nCleaned the evaporator coil.", notes: "Customer advice." });
  expect(api.patchTask).toHaveBeenCalledWith("test-session", "task1", expect.objectContaining({ serviceType: "deep_cleaning", findings: "Dust buildup on the evaporator coil.", serviceActions: ["Removed and disassembled the indoor unit for deep cleaning.", "Cleaned the evaporator coil."], notes: "Customer advice." }));
});

test("actual costs and hours survive save, reload and edit; deleting a note recalculates costs", async () => {
  let task = { serviceLogs: [] };
  api.fetchTask.mockImplementation(async () => ({ success: true, task }));
  api.patchTask.mockImplementation(async (_token, _id, payload) => { task = { ...task, ...payload }; return { success: true, task }; });
  await upsertServiceLog({ id: 'first', taskId: 'task1', hoursSpent: 2.5, laborCost: 200, partsCost: 50, partsUsed: 'Filter', findings: 'Dust on filter', resolution: 'Cleaned filter' });
  expect(task).toMatchObject({ laborCost: 200, partsCost: 50 });
  expect((await getServiceLogsByTask('task1'))[0]).toMatchObject({ hoursSpent: 2.5, laborCost: 200, partsCost: 50 });
  await upsertServiceLog({ id: 'first', taskId: 'task1', laborCost: 250 });
  expect(task.laborCost).toBe(250);
  await upsertServiceLog({ id: 'second', taskId: 'task1', laborCost: 100, partsCost: 0 });
  expect(task).toMatchObject({ laborCost: 350, partsCost: 50 });
  await deleteServiceLog('task1', 'second');
  expect(task.laborCost).toBe(250);
  await deleteServiceLog('task1', 'first');
  expect(task).toMatchObject({ laborCost: null, partsCost: null });
});
