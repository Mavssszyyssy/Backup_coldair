import { apiFetch } from "../constants/config";
import { updatePreferences } from "./api";

jest.mock("../constants/config", () => ({
  API_BASE: "https://fixture.invalid/api",
  apiFetch: jest.fn(),
}));
jest.mock("./tokenStorage", () => ({ readAuthToken: jest.fn() }));

test("saves the language in the existing account preference endpoint", async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ user: { id: "customer-1", preferences: { language: "Filipino" } } }),
  });

  await expect(updatePreferences("session-token", { language: "Filipino" })).resolves.toEqual({
    success: true,
    user: { id: "customer-1", preferences: { language: "Filipino" } },
  });
  expect(apiFetch).toHaveBeenCalledWith(
    expect.stringContaining("/users/preferences"),
    expect.objectContaining({ method: "PATCH", body: JSON.stringify({ language: "Filipino" }) }),
  );
});
