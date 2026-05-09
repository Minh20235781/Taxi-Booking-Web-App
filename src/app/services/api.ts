const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const AUTH_TOKEN_KEY = "auth_token";

export interface LocationSuggestion {
  placeId: string;
  label: string;
  lat: number;
  lon: number;
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      localStorage.removeItem("auth_user");
    }
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export const api = {
  signup: (payload: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: "USER" | "DRIVER";
  }) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string; role: "USER" | "DRIVER" }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  me: () => request("/auth/me"),

  suggestLocations: (
    query: string,
    limit = 5,
    options: { signal?: AbortSignal } = {}
  ): Promise<{ suggestions: LocationSuggestion[] }> =>
    request(`/locations/suggest?q=${encodeURIComponent(query)}&limit=${limit}`, {
      signal: options.signal
    }),

  previewRoute: (payload: {
    from: { lat: number; lon: number };
    to: { lat: number; lon: number };
  }): Promise<{
    distance: number;
    duration: number;
    geometry: { type: string; coordinates: [number, number][] };
  }> => request("/routes/preview", { method: "POST", body: JSON.stringify(payload) }),

  createBookingFlow: (payload: {
    pickupAddress: string;
    destination: string;
    vehicleClassCode: string;
  }) => request("/bookings/create-flow", { method: "POST", body: JSON.stringify(payload) })
};
