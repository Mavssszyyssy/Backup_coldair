import { generateAmpReport } from "./api";
import { apiFetch } from "../constants/config";
jest.mock("../constants/config", () => ({ API_BASE: "http://test.invalid/api", apiFetch: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn() }));
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => { jest.useRealTimers(); });

test("AMP report can finish after the old ten-second cutoff", async () => {
  apiFetch.mockImplementation((_path, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => { const error = new Error("Abort"); error.name = "AbortError"; reject(error); });
    setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({ report: { reportId: "late-report" }, provider: "system-fallback" }) }), 12000);
  }));
  const pending = generateAmpReport("test-token", { unitId: "unit-1" });
  await jest.advanceTimersByTimeAsync(12000);
  expect(await pending).toMatchObject({ success: true, report: { reportId: "late-report" } });
});

test("AMP timeout uses report wording, not installation-photo wording", async () => {
  apiFetch.mockImplementation((_path, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => { const error = new Error("Abort"); error.name = "AbortError"; reject(error); });
  }));
  const pending = generateAmpReport("test-token", { unitId: "unit-1" });
  const assertion = expect(pending).rejects.toThrow("Your AC report took too long to load");
  await jest.advanceTimersByTimeAsync(30000);
  await assertion;
  expect(apiFetch).toHaveBeenCalledTimes(1);
});
