import { apiFetch } from "../constants/config";
import { fetchNotifications } from "./api";

jest.mock("../constants/config", () => ({
  API_BASE: "https://fixture.invalid/api",
  apiFetch: jest.fn(),
}));
jest.mock("./tokenStorage", () => ({
  readAuthToken: jest.fn(),
}));

beforeEach(() => apiFetch.mockReset());

test("shares simultaneous identical mobile reads", async () => {
  let complete;
  apiFetch.mockImplementation(() => new Promise((resolve) => {
    complete = () => resolve({
      ok: true,
      status: 200,
      json: async () => ({ notifications: [{ id: "notice-1" }] }),
    });
  }));

  const first = fetchNotifications("token-1");
  const second = fetchNotifications("token-1");

  expect(apiFetch).toHaveBeenCalledTimes(1);
  complete();
  await expect(Promise.all([first, second])).resolves.toEqual([
    { success: true, notifications: [{ id: "notice-1" }] },
    { success: true, notifications: [{ id: "notice-1" }] },
  ]);
});

test("does not share reads across authenticated users", async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ notifications: [] }),
  });

  await Promise.all([
    fetchNotifications("token-1"),
    fetchNotifications("token-2"),
  ]);

  expect(apiFetch).toHaveBeenCalledTimes(2);
});
