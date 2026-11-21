import { readFileSync, writeFileSync } from "node:fs";

const source = new URL("../backend/src/domain/branchInputValidation.js", import.meta.url);
const backendCode = readFileSync(source, "utf8");
const webCode = backendCode.replace('const { validateHumanText } = require("./textFieldValidation");', 'import { validateHumanText } from "../textFieldValidation";')
  .replace('const serviceAreaReference = require("./serviceAreaNames.json");', 'import serviceAreaReference from "./serviceAreaNames.json";')
  .replace(/^module\.exports = /m, "export ");
if (webCode === backendCode) throw new Error("Expected a CommonJS export in the branch input validator.");
writeFileSync(new URL("../front/src/domain/branches/branchInputValidation.js", import.meta.url), webCode);
writeFileSync(new URL("../front/src/domain/branches/serviceAreaNames.json", import.meta.url), readFileSync(new URL("../backend/src/domain/serviceAreaNames.json", import.meta.url)));
