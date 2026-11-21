export const PERSON_NAME_MAX_LENGTH = 20;
import { validateHumanText } from "./textFieldValidation";
export const FULL_NAME_MAX_LENGTH = PERSON_NAME_MAX_LENGTH * 2 + 1;

export const validatePersonName = (value, label = "Name") => {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return `${label} is required`;
  if (text.length < 2 || text.length > PERSON_NAME_MAX_LENGTH) return `${label} must be 2–${PERSON_NAME_MAX_LENGTH} characters`;
  if (!text.split(/\s+/u).every((part) => /^[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*\.?$/u.test(part))) return `${label} may contain letters, spaces, apostrophes, periods, and hyphens only`;
  if (/(.)\1{4,}/iu.test(text)) return `${label} contains too many repeated characters`;
  const words = text.toLocaleLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
  if (words.some((word, index) => (
    (index >= 2 && word === words[index - 1] && word === words[index - 2]) ||
    (index >= 3 && word === words[index - 2] && words[index - 1] === words[index - 3])
  ))) return `${label} contains repeated words`;
  return validateHumanText(text, { max: PERSON_NAME_MAX_LENGTH, label, kind: "person" });
};

export const validateFullName = (value) => {
  const [first, ...last] = String(value || "").trim().split(/\s+/u);
  return validatePersonName(first, "First name") || validatePersonName(last.join(" "), "Last name");
};
