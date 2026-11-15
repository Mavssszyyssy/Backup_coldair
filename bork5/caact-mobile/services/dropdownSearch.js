const normalize = (text) => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function dropdownSearch(query) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return (...fields) => {
    const text = normalize(fields.join(" "));
    return words.every((word) => text.includes(word));
  };
}
