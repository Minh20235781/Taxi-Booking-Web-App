export function normalizeSearchInput(input) {
  return String(input || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function parseHanoiBbox(rawBbox) {
  const fallback = {
    minLon: 105.73,
    minLat: 20.95,
    maxLon: 106.02,
    maxLat: 21.25
  };
  if (!rawBbox) {
    return fallback;
  }
  const values = rawBbox.split(",").map((part) => Number(part.trim()));
  if (values.length !== 4 || values.some((item) => Number.isNaN(item))) {
    return fallback;
  }
  return {
    minLon: values[0],
    minLat: values[1],
    maxLon: values[2],
    maxLat: values[3]
  };
}
