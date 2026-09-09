import React, { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react-native";
import ServiceReportQuickChoices from "./ServiceReportQuickChoices";
import { serviceReportError } from "../../services/serviceReportValidation";

afterEach(cleanup);
function Form({ type = "regular_cleaning", initial = "", onFindings = jest.fn(), onWork = jest.fn(), onValidation }) {
  const [findings, setFindings] = useState(initial);
  const [work, setWork] = useState("");
  return <ServiceReportQuickChoices serviceType={type} findings={findings} resolution={work} onFindingsChange={next => { setFindings(next); onFindings(next); }} onResolutionChange={next => { setWork(next); onWork(next); }} onValidationChange={onValidation} />;
}

test("blank multi-select dropdowns do not invent findings; selections toggle without duplicates", async () => {
  const changed = jest.fn();
  await render(<Form onFindings={changed} />);
  expect(screen.getAllByText("Select one or more")).toHaveLength(2);
  await fireEvent.press(screen.getByLabelText("Select Technician Findings"));
  expect(changed).not.toHaveBeenCalled();
  const option = "Technician Findings: Dust buildup on the air filter.";
  await fireEvent.press(screen.getByLabelText(option));
  expect(changed).toHaveBeenLastCalledWith("Dust buildup on the air filter.");
  await fireEvent.press(screen.getByLabelText(option));
  expect(changed).toHaveBeenLastCalledWith("");
  await fireEvent.press(screen.getByLabelText(option));
  expect(changed).toHaveBeenLastCalledWith("Dust buildup on the air filter.");
  await fireEvent.press(screen.getByLabelText("Done selecting Technician Findings"));
  expect(screen.queryByLabelText(option)).toBeNull();
  expect(screen.getByText("Dust buildup on the air filter.")).toBeTruthy();
});

test("existing draft prose survives opening and choosing a standard finding", async () => {
  const changed = jest.fn();
  await render(<Form initial="Existing observation from the technician." onFindings={changed} />);
  expect(screen.getByLabelText("Other technician findings").props.value).toBe("Existing observation from the technician.");
  expect(changed).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Select Technician Findings"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Dust buildup on the air filter."));
  expect(changed).toHaveBeenLastCalledWith("Dust buildup on the air filter.\nExisting observation from the technician.");
});

test("Other requires details even alongside a predefined selection", async () => {
  const validation = jest.fn();
  await render(<Form onValidation={validation} />);
  await fireEvent.press(screen.getByLabelText("Select Technician Findings"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Dust buildup on the air filter."));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Other"));
  expect(validation).toHaveBeenLastCalledWith(expect.stringContaining("Other"));
  await fireEvent.changeText(screen.getByLabelText("Other technician findings"), "Loose cover was vibrating.");
  expect(validation).toHaveBeenLastCalledWith("");
  await fireEvent.changeText(screen.getByLabelText("Other technician findings"), "");
  expect(validation).toHaveBeenLastCalledWith(expect.stringContaining("Other"));
  await fireEvent.press(screen.getByLabelText("Technician Findings: Other"));
  expect(validation).toHaveBeenLastCalledWith("");
});

test.each([
  ["regular_cleaning", "Cleaned the air filter.", "Replaced the control board."],
  ["deep_cleaning", "Removed and disassembled the indoor unit for deep cleaning.", "Replaced the compressor."],
  ["repair", "Replaced the control board.", "Cleaned the air filter."],
  ["inspection", "Tested cooling and airflow.", "Replaced the compressor."],
])("%s lists appropriate work and no automatic actions", async (type, present, absent) => {
  const changed = jest.fn();
  await render(<Form type={type} onWork={changed} />);
  await fireEvent.press(screen.getByLabelText("Select Work Performed"));
  expect(screen.getByLabelText("Work Performed: " + present)).toBeTruthy();
  expect(screen.queryByLabelText("Work Performed: " + absent)).toBeNull();
  expect(changed).not.toHaveBeenCalled();
});

test("generic text still fails the existing written-report validation", () => {
  expect(serviceReportError("AMP recommended regular cleaning for this AC unit.", "Service completed")).not.toBe("");
  expect(serviceReportError("Dust buildup on the air filter.", "Cleaned the air filter.")).toBe("");
});
