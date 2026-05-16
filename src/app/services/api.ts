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

  estimatePricing: (payload: {
    vehicleClassCode: string;
    distanceMeters?: number;
    durationSeconds?: number;
    from?: { lat: number; lon: number };
    to?: { lat: number; lon: number };
  }): Promise<{
    fare: {
      vehicleClassCode: string;
      baseFare: number;
      distanceFare: number;
      durationFare: number;
      totalFare: number;
      distanceMeters: number;
      durationSeconds: number;
    };
  }> => request("/pricing/estimate", { method: "POST", body: JSON.stringify(payload) }),

  createBookingFlow: (payload: {
    pickupAddress: string;
    destination: string;
    vehicleClassCode: string;
    bookingType?: "INSTANT" | "SCHEDULED";
    scheduledAt?: string;
    pickupPlaceId?: string;
    destinationPlaceId?: string;
    pickupLat?: number;
    pickupLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    routeDistanceMeters?: number;
    routeDurationSeconds?: number;
    estimatedFare?: number;
    paymentMethod?: string;
    paymentMethodLabel?: string;
    preferences?: {
      languages?: string[];
      ridePreferences?: string[];
      specialRequest?: string;
    };
  }) => request("/bookings/create-flow", { method: "POST", body: JSON.stringify(payload) }),

  getDriverProfile: () => request("/driver/profile"),
  updateDriverProfile: (payload: any) => request("/driver/profile", { method: "PUT", body: JSON.stringify(payload) }),
  getPendingRequests: () => request("/driver/pending-requests"),
  acceptRide: (bookingId: number) => request(`/driver/accept-ride/${bookingId}`, { method: "POST" }),
  declineRide: (bookingId: number) => request(`/driver/decline-ride/${bookingId}`, { method: "POST" }),
  getBookingWithRide: (bookingId: number) => request(`/bookings/with-ride/${bookingId}`),
  getDriverAcceptedRides: () => request(`/driver/accepted-rides`),
  getRecentBookings: () => request(`/bookings/my-recent`),  getCompletedRides: () => request(`/bookings/my-completed`),
  getUpcomingRides: () => request(`/bookings/my-upcoming`),};
