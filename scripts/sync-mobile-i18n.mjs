import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
copyFileSync(
  resolve(root, "front/src/utils/customerI18n.js"),
  resolve(root, "bork5/caact-mobile/services/interfaceI18n.js"),
);
