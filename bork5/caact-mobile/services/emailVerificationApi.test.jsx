import { apiFetch } from "../constants/config";
import { verifyRegistrationOtp } from "./api";

jest.mock("../constants/config", () => ({
  API_BASE: "https://fixture.invalid/api",
  apiFetch: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

beforeEach(() => apiFetch.mockReset());

test("mobile registration preserves the verified-email proof returned by the API", async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      message: "Email verified.",
      registrationVerificationToken: "verified-email-proof",
      registrationProgress: { emailVerified: true },
    }),
  });

  const result = await verifyRegistrationOtp({
    action: "register_email",
    channel: "email",
    email: "customer@example.com",
    code: "123456",
  });

  expect(result).toEqual({
    success: true,
    message: "Email verified.",
    registrationVerificationToken: "verified-email-proof",
    registrationProgress: { emailVerified: true },
  });
  expect(apiFetch).toHaveBeenCalledWith(
    "/auth/verify-otp",
    expect.objectContaining({ method: "POST" }),
  );
  expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual(expect.objectContaining({
    action: "register_email",
    channel: "email",
    email: "customer@example.com",
    code: "123456",
  }));
});
