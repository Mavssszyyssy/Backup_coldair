import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "./api";
import { TASK_STATUS, updateTaskStatus } from "./taskStorage";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("./api", () => ({
  getStoredToken: jest.fn(),
  fetchTask: jest.fn(),
  patchTask: jest.fn(),
}));

const installationTask = {
  id: "task-install-1",
  taskCode: "TSK-INSTALL-1",
  orderId: "order-1",
  title: "Install AC unit",
  status: "Installing",
  customerName: "Fixture Customer",
  serialNumbers: ["CAACT-001"],
  registrationProgress: { totalRequired: 1, totalRegistered: 1, isComplete: true },
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  api.getStoredToken.mockResolvedValue("fixture-token");
});

test("first completion tap uses the screen's current task and performs one mutation without a prerequisite refetch", async () => {
  const completedTask = {
    ...installationTask,
    status: "Completed",
    completionSynchronized: true,
    completedAt: "2026-09-21T01:00:00.000Z",
    proof: { afterPhotos: [{ uri: "https://proof.example/installed.jpg" }] },
  };
  api.patchTask.mockResolvedValue({ success: true, task: completedTask });

  const result = await updateTaskStatus(
    installationTask.id,
    TASK_STATUS.COMPLETED,
    "Fixture Technician",
    { proof: { afterPhotos: [{ uri: "data:image/jpeg;base64,cHJvb2Y=" }] } },
    { currentTask: installationTask },
  );

  expect(api.fetchTask).not.toHaveBeenCalled();
  expect(api.patchTask).toHaveBeenCalledTimes(1);
  expect(api.patchTask).toHaveBeenCalledWith(
    "fixture-token",
    installationTask.id,
    expect.objectContaining({ status: TASK_STATUS.COMPLETED, proof: expect.any(Object) }),
  );
  expect(result).toMatchObject({ id: installationTask.id, status: TASK_STATUS.COMPLETED, completionSynchronized: true });
  expect(JSON.parse(await AsyncStorage.getItem("technician_tasks_storage_v2"))).toEqual([
    expect.objectContaining({ id: installationTask.id, status: TASK_STATUS.COMPLETED, completionSynchronized: true }),
  ]);
});

test("a malformed success response cannot clear the active work-order screen", async () => {
  api.patchTask.mockResolvedValue({ success: true, task: null });

  await expect(updateTaskStatus(
    installationTask.id,
    TASK_STATUS.COMPLETED,
    "Fixture Technician",
    {},
    { currentTask: installationTask },
  )).rejects.toThrow(/without returning the updated work order/i);
});
