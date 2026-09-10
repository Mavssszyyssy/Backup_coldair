import React from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react-native";
import CompleteServiceScreen from "../app/technician/task/[id]/complete-service";
import { notifyNotificationsChanged } from './notificationEvents';
const mockUpdate = jest.fn();
afterEach(() => { cleanup(); jest.restoreAllMocks(); mockUpdate.mockClear(); });
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({ id: "visit1" }), useFocusEffect: (callback) => require("react").useEffect(callback, [callback]) }));
jest.mock("expo-camera", () => ({
  CameraView: require("react").forwardRef((_props, ref) => {
    require("react").useImperativeHandle(ref, () => ({ takePictureAsync: async () => ({ base64: "cHJvb2Y=" }) }));
    return null;
  }),
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: { id: "tech1", name_first: "Technician" } }) }));
jest.mock("./taskStorage", () => ({ TASK_STATUS: { COMPLETED: "completed" }, getTaskById: async () => ({ id: "visit1", requestId: "request1", title: "Maintenance", description: "Please check the airflow", status: "in-progress" }), updateTaskStatus: (...args) => mockUpdate(...args) }));

test("technician can select actual observations/actions and submit one complete report without retyping; generic completion is blocked locally", async () => {
  let confirmCompletion = false;
  const alert = jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    if (confirmCompletion) buttons?.find((button) => button.text === "Complete")?.onPress();
  });
  mockUpdate.mockResolvedValue({ status: "completed" });
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><CompleteServiceScreen /></SafeAreaProvider>);
  await screen.findByText("Regular Cleaning");
  expect(screen.queryByText("Inspection")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Select Technician Findings"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Other"));
  await fireEvent.changeText(screen.getByLabelText("Other technician findings"), "AMP recommended regular cleaning for this AC unit.");
  await fireEvent.press(screen.getByLabelText("Select Work Performed"));
  await fireEvent.press(screen.getByLabelText("Work Performed: Other"));
  await fireEvent.changeText(screen.getByLabelText("Other work performed"), "Service completed");
  await fireEvent.press(screen.getAllByText("Complete service visit").at(-1));
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(alert.mock.calls.at(-1)[0]).toBe("Service report incomplete");
  await fireEvent.press(screen.getByLabelText("Work Performed: Other"));
  await fireEvent.press(screen.getByLabelText("Work Performed: Cleaned the air filter."));
  await fireEvent.press(screen.getByLabelText("Work Performed: Tested cooling and airflow after cleaning."));
  await fireEvent.press(screen.getByLabelText("Select Technician Findings"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Other"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Dust buildup on the air filter."));
  await fireEvent.changeText(screen.getByLabelText("Additional Notes (Optional)"), "Advised the customer to keep the air inlet clear.");
  await screen.findByText("Capture an after-service photo before completing this visit.");
  await fireEvent.press(screen.getAllByText("Complete service visit").at(-1));
  expect(mockUpdate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Capture after-service photo"));
  await fireEvent.press(screen.getByText("Use this photo"));
  await screen.findByText("Report ready to submit");
  confirmCompletion = true;
  await fireEvent.press(screen.getAllByText("Complete service visit").at(-1));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(mockUpdate.mock.calls[0][3]).toMatchObject({ serviceType: "regular_cleaning", findings: "Dust buildup on the air filter.", serviceActions: ["Cleaned the air filter.", "Tested cooling and airflow after cleaning."] });
  expect(mockUpdate.mock.calls[0][3]).toMatchObject({ afterCondition: "Good", proof: { afterPhotos: [{ uri: "data:image/jpeg;base64,cHJvb2Y=" }] } });
  expect(mockUpdate.mock.calls[0][3].notes).toBe("Advised the customer to keep the air inlet clear.");
  alert.mockRestore();
});

test("changing cleaning method asks first, clears report selections, and keeps photo and additional notes", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><CompleteServiceScreen /></SafeAreaProvider>);
  await screen.findByText("Regular Cleaning");
  await fireEvent.press(screen.getByText("Capture after-service photo"));
  await fireEvent.press(screen.getByText("Use this photo"));
  await fireEvent.press(screen.getByLabelText("Select Technician Findings"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Dust buildup on the air filter."));
  await fireEvent.changeText(screen.getByLabelText("Additional Notes (Optional)"), "Keep this advice.");
  await act(async () => notifyNotificationsChanged());
  expect(screen.getByText("Retake photo")).toBeTruthy();
  expect(screen.getByLabelText("Additional Notes (Optional)").props.value).toBe("Keep this advice.");
  expect(screen.getByLabelText("Technician Findings: Dust buildup on the air filter.").props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByText("Deep Cleaning"));
  expect(alert.mock.calls.at(-1)[0]).toBe("Change service method?");
  expect(screen.getByLabelText("Technician Findings: Dust buildup on the air filter.").props.accessibilityState.checked).toBe(true);
  await act(async () => alert.mock.calls.at(-1)[2].find(button => button.text === "Change method").onPress());
  expect(screen.getAllByText("Select one or more")).toHaveLength(3);
  expect(screen.getByText("Retake photo")).toBeTruthy();
  expect(screen.getByLabelText("Additional Notes (Optional)").props.value).toBe("Keep this advice.");
  await fireEvent.press(screen.getByLabelText("Select Work Performed"));
  expect(screen.getByLabelText("Work Performed: Removed and disassembled the indoor unit for deep cleaning.")).toBeTruthy();
});
