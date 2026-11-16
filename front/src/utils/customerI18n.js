import { createTranslator, isFilipino } from "./customerI18nCore";

let dictionary;
let loading;

export { isFilipino };
export const translateText = createTranslator(() => dictionary);

export function loadInterfaceLanguage(language) {
  if (!isFilipino(language) || dictionary) return Promise.resolve();
  loading ??= import("./filipinoTranslations").then(({ default: translations }) => {
    dictionary = translations;
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
