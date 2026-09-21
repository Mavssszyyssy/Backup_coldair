import { apiFetch } from "../constants/config";
import {
  collectServicePayment,
  confirmCodCollection,
  createMyServiceRequest,
  patchServiceRequestStatus,
  patchTask,
  submitVisitAttempt,
} from "./api";

jest.mock("../constants/config", () => ({
  API_BASE: "https://api.coldair-act.online/api",
  apiFetch: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});

const lostResponse = () => {
  const error = new Error("The response was lost");
  error.code = "BACKEND_FETCH_TIMEOUT";
  return error;
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("a task completion response lost on weak signal is verified without replaying the write", async () => {
  let savedMutationId = "";
  apiFetch.mockImplementation(async (_path, options = {}) => {
    if (options.method === "PATCH") {
      savedMutationId = JSON.parse(options.body).clientMutationId;
      throw lostResponse();
    }
    return response({ task: { id: "task-1", status: "completed", clientMutationId: savedMutationId } });
  });

  await expect(patchTask("token", "task-1", { status: "completed" })).resolves.toMatchObject({
    success: true,
    reconciled: true,
    task: { status: "completed" },
  });
  expect(apiFetch.mock.calls.filter(([, options]) => options.method === "PATCH")).toHaveLength(1);
  expect(apiFetch.mock.calls[1][1]).toMatchObject({ method: "GET", maxAttempts: 1 });
});

test("cash collection outcomes are recovered from the authoritative task", async () => {
  apiFetch
    .mockRejectedValueOnce(lostResponse())
    .mockResolvedValueOnce(response({ task: { id: "task-1", codPayment: { collectedAt: "2026-09-22T01:00:00Z" } } }))
    .mockRejectedValueOnce(lostResponse())
    .mockResolvedValueOnce(response({ task: { id: "task-2", servicePayment: { status: "paid", collectedAt: "2026-09-22T01:01:00Z" } } }));

  await expect(confirmCodCollection("token", "task-1")).resolves.toMatchObject({ success: true, reconciled: true });
  await expect(collectServicePayment("token", "task-2", { amount: 1200, quoteId: "quote-1" })).resolves.toMatchObject({ success: true, reconciled: true });
});

test("service request submission and cancellation reconcile after their responses are lost", async () => {
  apiFetch
    .mockRejectedValueOnce(lostResponse())
    .mockResolvedValueOnce(response({ requests: [{ id: "request-1", idempotencyKey: "service-key", status: "Submitted" }] }))
    .mockRejectedValueOnce(lostResponse())
    .mockResolvedValueOnce(response({ requests: [{ id: "request-1", status: "Cancelled" }] }));

  await expect(createMyServiceRequest("token", { idempotencyKey: "service-key", unitId: "unit-1" })).resolves.toMatchObject({
    success: true,
    reconciled: true,
    request: { id: "request-1" },
  });
  await expect(patchServiceRequestStatus("token", "request-1", { status: "Cancelled" })).resolves.toMatchObject({
    success: true,
    reconciled: true,
    request: { status: "Cancelled" },
  });
});

test("an unverified weak-signal write remains failed and is never replayed", async () => {
  apiFetch
    .mockRejectedValueOnce(lostResponse())
    .mockResolvedValueOnce(response({ task: { id: "task-1", status: "in-progress", clientMutationId: "another-write" } }));

  await expect(patchTask("token", "task-1", { status: "completed" })).rejects.toThrow("Unable to connect to the server");
  expect(apiFetch.mock.calls.filter(([, options]) => options.method === "PATCH")).toHaveLength(1);
});

test("an interrupted successful response body is reconciled from the saved task", async () => {
  let savedMutationId = "";
  apiFetch.mockImplementationOnce(async (_path, options = {}) => {
    savedMutationId = JSON.parse(options.body).clientMutationId;
    return {
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new Error("response stream ended")),
    };
  }).mockImplementationOnce(async () => response({
    task: { id: "task-1", status: "completed", clientMutationId: savedMutationId },
  }));

  await expect(patchTask("token", "task-1", { status: "completed" })).resolves.toMatchObject({
    success: true,
    reconciled: true,
  });
});

test("an unattended visit is verified from the exact arrival without replaying it", async () => {
  const input = {
    checkedInAt: "2026-09-22T02:00:00Z",
    outcome: "reschedule",
    note: "Customer was unavailable.",
    photo: { uri: "data:image/jpeg;base64,/9j/example" },
  };
  apiFetch
    .mockRejectedValueOnce(lostResponse())
    .mockResolvedValueOnce(response({
      attempt: {
        id: "attempt-1",
        checkedInAt: input.checkedInAt,
        outcome: input.outcome,
      },
    }));

  await expect(submitVisitAttempt("token", "task-1", input)).resolves.toMatchObject({
    id: "attempt-1",
    reconciled: true,
  });
  expect(apiFetch.mock.calls.filter(([, options]) => options.method === "PATCH")).toHaveLength(1);
  expect(apiFetch.mock.calls[1][1]).toMatchObject({ method: "GET", maxAttempts: 1 });
});
