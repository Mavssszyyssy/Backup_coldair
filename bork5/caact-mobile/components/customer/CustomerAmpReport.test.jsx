import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import CustomerAmpReport from "./CustomerAmpReport";

jest.mock("../../hooks/useInterfaceLanguage", () => {
  const { translateText } = require("../../services/interfaceI18n");
  return { useInterfaceLanguage: () => ({ language: "Filipino", t: (value) => translateText(value, "Filipino") }) };
});

test("Filipino AMP report localizes controls and keeps recorded and AI findings intact", async () => {
  await render(<CustomerAmpReport report={{
    reportType: "maintenance_summary",
    maintenance: {
      predictiveAssessment: { assessmentSummary: "Cooling and fan noise need inspection." },
      latestVisitAnalysis: {
        technicianRecorded: "May ingay sa fan.",
        aiAssessment: "Cooling and fan noise need inspection.",
      },
    },
  }} />);

  expect(screen.getByText("Kasaysayan ng iyong serbisyo")).toBeTruthy();
  expect(screen.getByText("1. Findings ng technician")).toBeTruthy();
  expect(screen.getByText("May ingay sa fan.")).toBeTruthy();
  expect(screen.getByText("Cooling and fan noise need inspection.")).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText("Paano ito tinukoy?")); });
  expect(screen.getByText("Ginamit na pattern")).toBeTruthy();
});
