import { readFileSync, writeFileSync } from "node:fs";

const source = new URL("../backend/src/domain/branchInputValidation.js", import.meta.url);
const backendCode = readFileSync(source, "utf8");
const webCode = backendCode.replace(/^module\.exports = /m, "export ");
if (webCode === backendCode) throw new Error("Expected a CommonJS export in the branch input validator.");
writeFileSync(new URL("../front/src/domain/branches/branchInputValidation.js", import.meta.url), webCode);
