import { normalizeSearchInput, parseHanoiBbox } from "./normalize.js";

function buildLabel(feature) {
  const props = feature?.properties || {};
  return props.name || props.label || props.display_name || "Unknown place";
}

function mapPhotonFeature(feature) {
  const coordinates = feature?.geometry?.coordinates || [];
  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }
  return {
    placeId: `photon:${feature.properties?.osm_id || `${lat},${lon}`}`,
    label: buildLabel(feature),
    lat,
    lon
  };
}

function mapNominatimResult(item) {
  const lat = Number(item?.lat);
  const lon = Number(item?.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }
  return {
    placeId: `nominatim:${item?.place_id || `${lat},${lon}`}`,
    label: item?.display_name || item?.name || "Unknown place",
    lat,
    lon
  };
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPhotonSuggestions(query, limit = 5) {
  const normalized = normalizeSearchInput(query);
  if (!normalized) {
    return [];
  }
  const bbox = parseHanoiBbox(process.env.HANOI_BBOX);
  const baseUrl = process.env.PHOTON_BASE_URL || "https://photon.komoot.io/api";
  const params = new URLSearchParams({
    q: normalized,
    lang: "ja",
    limit: String(limit),
    bbox: [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat].join(",")
  });
  const url = `${baseUrl}?${params.toString()}`;
  const data = await fetchJsonWithTimeout(url);
  const features = Array.isArray(data?.features) ? data.features : [];
  return features.map(mapPhotonFeature).filter(Boolean);
}

export async function fetchNominatimSuggestions(query, limit = 5) {
  const normalized = normalizeSearchInput(query);
  if (!normalized) {
    return [];
  }
  const bbox = parseHanoiBbox(process.env.HANOI_BBOX);
  const baseUrl =
    process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org/search";
  const params = new URLSearchParams({
    q: normalized,
    format: "jsonv2",
    addressdetails: "1",
    bounded: "1",
    viewbox: [bbox.minLon, bbox.maxLat, bbox.maxLon, bbox.minLat].join(","),
    limit: String(limit)
  });
  const url = `${baseUrl}?${params.toString()}`;
  const data = await fetchJsonWithTimeout(
    url,
    {
      headers: {
        "User-Agent": process.env.NOMINATIM_USER_AGENT || "taxi-booking-app/1.0"
      }
    },
    5000
  );
  const items = Array.isArray(data) ? data : [];
  return items.map(mapNominatimResult).filter(Boolean);
}

export function mergeAndDedupeSuggestions(...lists) {
  const merged = lists.flat();
  const uniqueByKey = new Map();
  for (const item of merged) {
    if (!item) {
      continue;
    }
    const key = item.placeId || `${item.lat},${item.lon},${item.label}`;
    if (!uniqueByKey.has(key)) {
      uniqueByKey.set(key, item);
    }
  }
  return Array.from(uniqueByKey.values());
}
