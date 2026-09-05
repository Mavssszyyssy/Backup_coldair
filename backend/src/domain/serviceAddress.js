// Keep the request's address snapshot; do not substitute a customer's newer address.
const key = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
function formatServiceAddress(address, details = {}) {
  const parts = String(address || "").split(",").map((value) => value.trim()).filter(Boolean);
  for (const value of [details.barangay, details.city, details.province, details.region, details.postalCode || details.zipCode]) {
    const part = String(value || "").trim();
    if (part && !parts.some((existing) => key(existing) === key(part))) parts.push(part);
  }
  return parts.join(", ");
}
module.exports = { formatServiceAddress };
