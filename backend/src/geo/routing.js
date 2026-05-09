async function fetchJsonWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRoutePreview({ from, to }) {
  const osrmBase = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
  const path = `/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}`;
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    alternatives: "false",
    steps: "false"
  });
  const url = `${osrmBase}${path}?${params.toString()}`;
  const data = await fetchJsonWithTimeout(url);
  const route = data?.routes?.[0];
  if (!route?.geometry?.coordinates?.length) {
    throw new Error("Route not found");
  }
  return {
    distance: Number(route.distance || 0),
    duration: Number(route.duration || 0),
    geometry: route.geometry
  };
}
