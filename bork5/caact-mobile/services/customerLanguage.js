// Customer display text only. Never changes saved records, policy, or prediction inputs.
export function receiptReferences(receiptNumber, orderNumber) {
  const receipt = String(receiptNumber || "").trim();
  const order = String(orderNumber || "").trim();
  return { receiptNumber: receipt || order || "Not available",
    orderNumber: receipt && order && receipt !== order && receipt !== `RCP-${order}` ? order : "" };
}
export function customerStatus(value) {
  const key = String(value || "").trim().toLowerCase().replace(/[ -]+/g, "_");
  return ({ to_pay: "Awaiting payment", to_deliver: "Preparing for delivery", to_install: "Awaiting installation",
    complete: "Completed", completed: "Completed", in_progress: "In progress", on_the_way: "On the way",
    pending: "Pending", submitted: "Request sent", reviewed: "Reviewed by our team", assigned: "Technician assigned",
    cancelled: "Cancelled", paid: "Paid", verified: "Payment confirmed" })[key]
    || String(value || "").replace(/[_-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
export function customerSystemMessage(value) {
  const text = String(value || "");
  // Translate only known system messages, never arbitrary service notes.
  if (text.startsWith("Provisional schedule using the system's configured ")) {
    const days = text.match(/configured (\d+)-day/)?.[1];
    if (days) return `For now, we suggest service ${days} days after the last recorded cleaning or installation. There is not enough complete cleaning history for a personalized AI estimate yet. Please confirm the timing with our service team.`;
  }
  if (text.startsWith("Insufficient service history. Default recommended cleaning interval: 6 months")) {
    return "There are not enough completed cleaning visits to personalize this date yet. For now, we suggest your next cleaning 6 months (180 days) after the latest recorded cleaning or installation.";
  }
  if (text.startsWith("Based on this AC unit's ")) {
    const count = text.match(/unit's (\d+) verified cleaning interval/)?.[1];
    const days = text.match(/average is (\d+) days/)?.[1];
    if (count && days) return `This suggestion uses ${count} completed gaps between cleanings for this AC. The average gap is ${days} days.`;
  }
  if (text.startsWith("This AC does not yet have two verified cleaning intervals")) {
    const count = text.match(/uses (\d+) interval/)?.[1];
    const days = text.match(/average is (\d+) days/)?.[1];
    if (count && days) return `This AC does not have enough of its own cleaning gaps yet, so ${count} verified gap(s) from similar ACs were used. Their average is ${days} days.`;
  }
  if (text.startsWith("AI-estimated servicing interval:")) {
    const days = text.match(/interval: (\d+) days/)?.[1];
    const samples = text.match(/(?:using|from) (\d+) (?:recorded|verified) cleaning interval/)?.[1];
    if (days && samples) {
      const group = text.includes("this AC unit") ? "this AC" : text.includes("same model") ? "the same model" : text.includes("same brand type") ? "similar ACs of the same brand and type" : "the same brand";
      return `AI suggests cleaning ${days} days after the latest recorded cleaning or installation, using ${samples} verified cleaning gap(s) for ${group}. It can only use the calculated average or a shorter gap already found in the records. It is not a guaranteed breakdown date, booking, or warranty decision.`;
    }
  }
  const records = text.match(/^(\d+) service record\(s\) have missing details or invalid dates and are excluded from maintenance timing/);
  if (records) return `${records[1]} service record(s) have missing details or incorrect dates and were not used to suggest this date. Please ask our service team to review them.`;
  const messages = {
    "Not enough verified model or brand cleaning history for an AI estimate. Showing the system schedule.": "There is not enough complete cleaning history for this model or brand yet. A system suggestion is shown instead of a new AI estimate.",
    "Insufficient verified cleaning intervals for an AI estimate. Showing the 6-month system baseline.": "There are not enough verified gaps between cleanings for AI yet. The 6-month starting schedule is shown instead.",
    "AI is unavailable. Showing the current saved or system recommendation.": "We could not get a new AI estimate right now. Your saved plan or a system suggestion is shown instead.",
    "AI timed out. Showing the current saved or system recommendation.": "The AI estimate took too long. Your saved plan or a system suggestion is shown instead. You can try again later.",
    "AI is busy. Showing the system recommendation.": "AI is busy right now. A system suggestion is shown instead.",
    "Technician findings and actions are incomplete. This record is excluded from maintenance timing.": "This visit is missing details about what was found or done, so it was not used to suggest your next service date.",
    "Service date precedes the recorded installation.": "This service date is earlier than the installation date. Please ask our service team to check it.",
    "Service date is in the future.": "This visit has a future date and was not used to suggest your next service.",
    "The service performed was not recorded.": "The type of work done was not recorded.",
    "A completed cleaning or installation date is needed before a servicing date can be suggested.": "We need your installation date or a completed cleaning date to suggest your next service.",
  };
  return messages[text] || text;
}
