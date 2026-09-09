export const LEGAL_VERSION = "2026-09-04";
export const LEGAL_DOCUMENTS = [
  { id: "app", title: "App Terms & Conditions", action: "I agree to the App Terms & Conditions" },
  { id: "service", title: "Service Terms & Conditions", action: "I agree to the Service Terms & Conditions" },
  { id: "warranty", title: "Warranty Terms & Conditions", action: "I agree to the Warranty Terms & Conditions" },
  { id: "privacy", title: "Data Privacy Notice", action: "I acknowledge the Data Privacy Notice" },
];
export const hasAllLegalConsents = value => LEGAL_DOCUMENTS.every(({ id }) => value?.[id] === true);
