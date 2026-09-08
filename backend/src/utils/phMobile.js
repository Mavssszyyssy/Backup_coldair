// Keep invalid input invalid; never truncate or erase letters to create a
// different, apparently valid identity. Formatting is removed only on save.
const canonicalizePhMobile = (value = "") => {
  const text = String(value ?? "").trim();
  if (!/^\+?[\d\s()-]+$/.test(text)) return text;
  const digits = text.replace(/\D/g, "");
  if (text.startsWith("+") && !/^639\d{9}$/.test(digits)) return text;
  if (/^639\d{9}$/.test(digits)) return `09${digits.slice(3)}`;
  if (/^9\d{9}$/.test(digits)) return `0${digits}`;
  return digits;
};
const isValidPhMobile = (value) => /^09\d{9}$/.test(canonicalizePhMobile(value));
module.exports = { canonicalizePhMobile, isValidPhMobile };
