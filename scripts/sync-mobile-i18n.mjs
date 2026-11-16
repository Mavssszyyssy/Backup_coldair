import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readWebSource = (file) => readFileSync(resolve(root, "front/src/utils", file), "utf8")
  .replace(/\r\n/g, "\n").trimEnd();
const dictionary = readWebSource("filipinoTranslations.js").replace(/^export default /, "const FILIPINO = ");
const core = readWebSource("customerI18nCore.js").replace(/^export const createTranslator/m, "const createTranslator");

writeFileSync(
  resolve(root, "bork5/caact-mobile/services/interfaceI18n.js"),
  `${dictionary}\n\n${core}\n\nexport const translateText = createTranslator(() => FILIPINO);\n`,
);
