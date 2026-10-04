/**
 * Comprehensive Philippine Mobile Validation Heuristics
 */

// List of known valid 4-digit prefixes (09XX or 08XX for DITO)
const VALID_PH_PREFIXES = new Set([
  // Globe / TM / Cherry / GOMO
  '0905', '0906', '0915', '0916', '0917', '0926', '0927', '0935', '0936', '0937',
  '0945', '0953', '0954', '0955', '0956', '0965', '0966', '0967', '0975', '0976',
  '0977', '0978', '0979', '0995', '0996', '0997',
  // Smart / TNT / Sun
  '0907', '0908', '0909', '0910', '0911', '0912', '0913', '0914', '0918', '0919',
  '0920', '0921', '0922', '0923', '0924', '0925', '0928', '0929', '0930', '0931',
  '0932', '0933', '0934', '0938', '0939', '0940', '0941', '0942', '0943', '0946',
  '0947', '0948', '0949', '0950', '0951', '0960', '0961', '0962', '0963', '0964',
  '0968', '0969', '0970', '0971', '0972', '0981', '0982', '0985', '0989', '0992',
  '0998', '0999', '0922', '0923', '0925', '0932', '0933', '0934', '0942', '0943',
  // DITO
  '0991', '0992', '0993', '0994', '0895', '0896', '0897', '0898'
]);

export function sanitizeLocalPhMobileInput(value = "") {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

export function validateLocalPhMobile(value = "") {
  if (!String(value).trim()) return "Phone number is required.";
  if (!/^09\d{9}$/.test(String(value))) {
    return "Enter exactly 11 digits in the format 09XXXXXXXXX.";
  }
  return "";
}

/**
 * Checks if a phone number string is likely to be a fake or placeholder.
 * @param {string} phone 11-digit string
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePhMobileHeuristic(phone) {
  if (!phone) return { valid: false, reason: "Phone number is required" };

  const clean = phone.replace(/\D/g, "");

  if (clean.length !== 11) {
    return { valid: false, reason: "Must be exactly 11 digits" };
  }

  if (!clean.startsWith("09") && !clean.startsWith("08")) {
    return { valid: false, reason: "Must start with 09 or 08" };
  }

  const prefix = clean.substring(0, 4);
  if (!VALID_PH_PREFIXES.has(prefix)) {
    return { valid: false, reason: `Unrecognized prefix (${prefix})` };
  }

  const lastSeven = clean.substring(4);

  // Check for all same digits (e.g. 0917-111-1111)
  if (/^(\d)\1{6}$/.test(lastSeven)) {
    return { valid: false, reason: "Unlikely: Repeating digits" };
  }

  // Check for simple sequences (e.g. 1234567, 7654321)
  const sequences = ["0123456", "1234567", "2345678", "3456789", "9876543", "8765432", "7654321", "6543210"];
  if (sequences.includes(lastSeven)) {
    return { valid: false, reason: "Unlikely: Sequential digits" };
  }

  return { valid: true };
}
