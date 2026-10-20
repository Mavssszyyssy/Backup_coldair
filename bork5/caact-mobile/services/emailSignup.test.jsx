import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SignUpStep0 from "../app/(auth)/sign-up/step/0";
import SignUpStep1 from "../app/(auth)/sign-up/step/1";
import SignUpStep2 from "../app/(auth)/sign-up/step/2";
import SignUpStep3 from "../app/(auth)/sign-up/step/3";
import { RegistrationDraftProvider, useRegistrationDraft } from "../context/RegistrationDraftContext";
import { LEGAL_DOCUMENTS, LEGAL_VERSION } from "./legalConsent";

const mockRequest = jest.fn();
const mockVerify = jest.fn();
const mockRegister = jest.fn();
const mockAlias = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }) }));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ register: mockRegister }) }));
jest.mock("./api", () => ({
  requestVerificationOtp: (...args) => mockRequest(...args),
  verifyRegistrationOtp: (...args) => mockVerify(...args),
  checkAliasAvailability: (...args) => mockAlias(...args),
  getEmailDomainPolicy: () => Promise.resolve({ success: true, activeDomains: null }),
}));
jest.mock("./philippineAddressService", () => ({
  getPhilippineRegions: () => Promise.resolve([]),
  getProvincesByRegion: () => Promise.resolve([]),
  getLocalitiesByProvince: () => Promise.resolve([]),
  getBarangaysByLocality: () => Promise.resolve([]),
}));

let updateDraftForTest;
function DraftCapture() {
  updateDraftForTest = useRegistrationDraft().updateDraft;
  return null;
}

const renderStep = (Screen) => render(
  <SafeAreaProvider initialMetrics={{
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
  }}>
    <RegistrationDraftProvider>
      <DraftCapture />
      <Screen />
    </RegistrationDraftProvider>
  </SafeAreaProvider>,
);

beforeEach(() => {
  jest.clearAllMocks();
  mockAlias.mockResolvedValue({ success: true, available: true });
  mockRequest.mockResolvedValue({ success: true });
  mockVerify.mockResolvedValue({ success: true, registrationVerificationToken: "email-proof" });
  mockRegister.mockResolvedValue({ success: true });
});

test("legal consent is required before advancing to email verification", async () => {
  const view = await renderStep(SignUpStep0);
  await fireEvent.press(view.getByText("Continue to email verification"));
  expect(mockPush).not.toHaveBeenCalled();
  for (const doc of LEGAL_DOCUMENTS) await fireEvent.press(view.getByLabelText(doc.action));
  await fireEvent.press(view.getByText("Continue to email verification"));
  expect(mockPush).toHaveBeenCalledWith("/sign-up/step/1");
});

test("email is verified before account details; changing it invalidates the proof", async () => {
  const view = await renderStep(SignUpStep1);
  await act(async () => updateDraftForTest({ legalConsent: { app: true, service: true, warranty: true, privacy: true } }));
  await fireEvent.changeText(view.getByPlaceholderText("you@example.com"), "customer@example.com");
  await fireEvent.press(view.getByText("Send Verification Code"));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ action: "register_email", channel: "email", email: "customer@example.com", phone: "" })));
  await fireEvent.changeText(view.getByPlaceholderText("Enter 6-digit code"), "123456");
  await fireEvent.press(view.getByText("Continue to account details"));
  await waitFor(() => expect(mockVerify).toHaveBeenCalledWith(expect.objectContaining({ email: "customer@example.com", code: "123456" })));
  expect(mockPush).toHaveBeenCalledWith("/sign-up/step/2");
  await fireEvent.changeText(view.getByPlaceholderText("you@example.com"), "new@example.com");
  await fireEvent.press(view.getByText("Continue to account details"));
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test("profile requires verified email and never infers staff role from email", async () => {
  const view = await renderStep(SignUpStep2);
  await fireEvent.press(view.getByText("Continue to delivery address"));
  expect(mockReplace).toHaveBeenCalledWith("/sign-up/step/0");
  await act(async () => updateDraftForTest({
    legalConsent: { app: true, service: true, warranty: true, privacy: true },
    email: "superadmin@example.com", emailVerified: true, registrationVerificationToken: "proof",
  }));
  await fireEvent.changeText(view.getByPlaceholderText("First name"), "Test");
  await fireEvent.changeText(view.getByPlaceholderText("Last name"), "Customer");
  await fireEvent.changeText(view.getByLabelText("Sign-in Alias"), "customer.alias");
  await fireEvent.changeText(view.getByLabelText("Password"), "StrongPass1!");
  await fireEvent.changeText(view.getByLabelText("Confirm Password"), "StrongPass1!");
  await fireEvent.press(view.getByText("Continue to delivery address"));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/sign-up/step/3"));
  expect(view.queryByText(/Role detected/)).toBeNull();
});

test("optional address can be skipped and registration keeps legal and email proof", async () => {
  const view = await renderStep(SignUpStep3);
  await act(async () => updateDraftForTest({
    legalConsent: { app: true, service: true, warranty: true, privacy: true },
    email: "customer@example.com", emailVerified: true, registrationVerificationToken: "email-proof",
    name_first: "Test", name_last: "Customer", alias: "test.customer", password: "StrongPass1!",
  }));
  await fireEvent.press(view.getByText("Continue Without Address"));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
    role: "customer", contact_method: "email", locations: [],
    registrationVerificationToken: "email-proof",
    legalConsent: { app: true, service: true, warranty: true, privacy: true, version: LEGAL_VERSION },
  })));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: "/customer/oobe", params: { registered: "1" } });
});

test("creating with an address requires complete location fields", async () => {
  const view = await renderStep(SignUpStep3);
  await act(async () => updateDraftForTest({
    legalConsent: { app: true, service: true, warranty: true, privacy: true },
    email: "customer@example.com", emailVerified: true, registrationVerificationToken: "email-proof",
    name_first: "Test", name_last: "Customer", alias: "test.customer", password: "StrongPass1!",
  }));
  await fireEvent.press(view.getAllByText("Create Account").at(-1));
  expect(mockRegister).not.toHaveBeenCalled();
  expect(view.getByText("Region is required.")).toBeTruthy();
});
