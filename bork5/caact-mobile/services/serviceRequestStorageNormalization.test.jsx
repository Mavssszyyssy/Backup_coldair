jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { normalizeServiceRequest } from "./serviceRequestStorage";

test("service requests preserve the backend MongoDB identifier for cancellation", () => {
  const request = normalizeServiceRequest({
    _id: "66f0f2f46d3a2e0012345678",
    status: "Submitted",
    payload: { status: "Submitted" },
  });

  expect(request.id).toBe("66f0f2f46d3a2e0012345678");
});
