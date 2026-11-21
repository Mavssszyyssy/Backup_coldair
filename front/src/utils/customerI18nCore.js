export const isFilipino = (language = "") => String(language).trim().toLowerCase() === "filipino";

export const createTranslator = (getDictionary) => (text = "", language = "English") => {
  if (!isFilipino(language)) return text;
  const dictionary = getDictionary();
  if (!dictionary) return text;
  if (Object.prototype.hasOwnProperty.call(dictionary, text)) return dictionary[text];
  const quality = typeof text === "string" && text.match(/^(.+): (enter meaningful text\.(?: Avoid random letters, placeholders, or repeated text\.)?|remove duplicate entries\.|choose a recognized Philippine location\.)$/);
  if (quality) return `${dictionary[quality[1]] || quality[1]}: ${dictionary[quality[2]] || quality[2]}`;
  const words = typeof text === "string" && text.match(/^(.+) must be (\d+) words or fewer\.$/);
  if (words) return `Hanggang ${words[2]} salita lang ang puwedeng ilagay sa ${dictionary[words[1]] || words[1]}.`;
  const limit = typeof text === "string" && text.match(/^(.+) must be (\d+) characters or fewer\.$/);
  return limit ? `Hanggang ${limit[2]} karakter lang ang puwedeng ilagay sa ${dictionary[limit[1]] || limit[1]}.` : text;
};
