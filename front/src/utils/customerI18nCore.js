export const isFilipino = (language = "") => String(language).trim().toLowerCase() === "filipino";

export const createTranslator = (getDictionary) => (text = "", language = "English") => {
  if (!isFilipino(language)) return text;
  const dictionary = getDictionary();
  if (!dictionary) return text;
  if (Object.prototype.hasOwnProperty.call(dictionary, text)) return dictionary[text];
  const limit = typeof text === "string" && text.match(/^(.+) must be (\d+) characters or fewer\.$/);
  return limit ? `Hanggang ${limit[2]} karakter lang ang puwedeng ilagay sa ${dictionary[limit[1]] || limit[1]}.` : text;
};
