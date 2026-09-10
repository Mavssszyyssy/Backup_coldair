// Preserve server IDs/prices; tolerate the catalogue from an older deployment.
export function customerServiceChoices(offerings = []) {
  return offerings.filter(item => !["delivery", "installation"].includes(String(item.id).toLowerCase()) && !/^(delivery|installation)$/i.test(String(item.title).trim())).map(item => {
    if (["maintenance", "regular_cleaning"].includes(item.id)) return { ...item, title:"Regular Cleaning", defaultIssueType:"Regular Cleaning", summary:"Routine AC maintenance when the last cleaning was less than one year ago." };
    if (["cleaning", "deep_cleaning"].includes(item.id)) return { ...item, title:"Deep Cleaning", defaultIssueType:"Deep Cleaning", summary:"Thorough cleaning when the last cleaning was more than one year ago. The unit is taken down for cleaning." };
    return item;
  });
}
