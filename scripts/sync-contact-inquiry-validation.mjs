import { readFileSync, writeFileSync } from "node:fs";

const source = new URL("../backend/src/domain/contactInquiryValidation.js", import.meta.url);
const backendCode = readFileSync(source, "utf8");
const clientCode = backendCode.replace(/^module\.exports = /m, "export ");
if (clientCode === backendCode) throw new Error("Expected a CommonJS export in the contact inquiry validator.");
for (const target of [
  "../front/src/domain/contactInquiryValidation.js",
  "../bork5/caact-mobile/utils/contactInquiryValidation.js",
]) {
  writeFileSync(new URL(target, import.meta.url), clientCode);
}
