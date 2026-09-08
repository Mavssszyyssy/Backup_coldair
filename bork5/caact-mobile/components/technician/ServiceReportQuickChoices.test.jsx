import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import ServiceReportQuickChoices from "./ServiceReportQuickChoices";
import { serviceReportError } from "../../services/serviceReportValidation";

test("quick choices never invent findings on opening, and selected text remains editable without duplicate insertion", async () => {
  const findings = jest.fn(); const work = jest.fn();
  function Form() {
    const [value, setValue] = useState("Technician's existing observation.");
    return <ServiceReportQuickChoices serviceType="regular_cleaning" findings={value} resolution="" onFindingsChange={(next) => { setValue(next); findings(next); }} onResolutionChange={work} />;
  }
  await render(<Form />);
  expect(findings).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Use quick choices (optional)"));
  expect(findings).not.toHaveBeenCalled(); expect(work).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Add: Dust buildup on the air filter."));
  expect(findings).toHaveBeenCalledWith("Technician's existing observation.\nDust buildup on the air filter.");
  await fireEvent.press(screen.getByLabelText("Add: Dust buildup on the air filter."));
  expect(findings).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByLabelText("Add: Cleaned the air filter."));
  expect(work).toHaveBeenCalledWith("Cleaned the air filter.");
  expect(screen.queryByLabelText("Add: Replaced the compressor.")).toBeNull();
});

test("warranty repair choices concern work performed, not coverage approval", async () => {
  await render(<ServiceReportQuickChoices serviceType="repair" findings="" resolution="" onFindingsChange={jest.fn()} onResolutionChange={jest.fn()} />);
  await fireEvent.press(screen.getByText("Use quick choices (optional)"));
  expect(screen.getByLabelText("Add: Replaced the control board.")).toBeTruthy();
  expect(screen.queryByLabelText("Add: Cleaned the air filter.")).toBeNull();
});

test("mobile validation rejects the same generic findings/actions as the server", () => {
  const validFinding = "Dust buildup on the air filter.";
  const validAction = "Cleaned the air filter.";
  for (const finding of ["", "dust", "AMP recommended regular cleaning for this AC unit.", "Service completed", "No findings recorded."]) expect(serviceReportError(finding, validAction)).not.toBe("");
  for (const action of ["", "ok", "Service completed", "done", "none", "N/A"]) expect(serviceReportError(validFinding, action)).not.toBe("");
  expect(serviceReportError(validFinding, validAction)).toBe("");
});
