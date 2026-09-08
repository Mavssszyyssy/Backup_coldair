import React from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import CompleteServiceScreen from "../app/technician/task/[id]/complete-service";
const mockUpdate = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({ id: "visit1" }), useFocusEffect: (callback) => require("react").useEffect(callback, [callback]) }));
jest.mock("expo-camera", () => ({ CameraView: "CameraView", useCameraPermissions: () => [{ granted: false }, jest.fn()] }));
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
  await fireEvent.changeText(screen.getByLabelText("Technician Findings"), "AMP recommended regular cleaning for this AC unit.");
  await fireEvent.changeText(screen.getByLabelText("Work Performed / Resolution"), "Service completed");
  await fireEvent.press(screen.getAllByText("Complete service visit").at(-1));
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(alert.mock.calls.at(-1)[0]).toBe("Service report incomplete");
  await fireEvent.changeText(screen.getByLabelText("Technician Findings"), "");
  await fireEvent.changeText(screen.getByLabelText("Work Performed / Resolution"), "");
  await fireEvent.press(screen.getByText("Use quick choices (optional)"));
  await fireEvent.press(screen.getByLabelText("Add: Dust buildup on the air filter."));
  await fireEvent.press(screen.getByLabelText("Add: Cleaned the air filter."));
  await fireEvent.press(screen.getByLabelText("Add: Tested cooling and airflow after cleaning."));
  await screen.findByText("Report ready to submit");
  confirmCompletion = true;
  await fireEvent.press(screen.getAllByText("Complete service visit").at(-1));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(mockUpdate.mock.calls[0][3]).toMatchObject({ serviceType: "regular_cleaning", findings: "Dust buildup on the air filter.", serviceActions: ["Cleaned the air filter.", "Tested cooling and airflow after cleaning."] });
  alert.mockRestore();
});
