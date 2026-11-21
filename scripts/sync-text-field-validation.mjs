import { readFileSync, writeFileSync } from "node:fs";
const source = readFileSync(new URL("../backend/src/domain/textFieldValidation.js", import.meta.url), "utf8");
const client = source.replace(/^module\.exports = /m, "export ");
if (client === source) throw new Error("Missing shared text validation export.");
for (const target of ["../front/src/domain/textFieldValidation.js", "../bork5/caact-mobile/utils/textFieldValidation.js"]) {
  writeFileSync(new URL(target, import.meta.url), client);
}
