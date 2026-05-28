export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const AUTH_TOKEN_KEY = "auth_token";

export interface LocationSuggestion {
  placeId: string;
  label: string;
  lat: number;
  lon: number;
}

export interface RideMessage {
  id: number;
  rideId: number;
  senderUserId: number;
  senderRole: "USER" | "DRIVER";
  body: string;
  translatedBody?: string | null;
  createdAt: string;
}

export type PaymentMethodCode = "MOMO" | "CASH" | "CARD";

export function getAuthToken() {
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
  updateUserProfile: (payload: { fullName?: string; email?: string; phone?: string; address?: string; city?: string; country?: string; avatarUrl?: string }) =>
    request("/user/profile", { method: "PUT", body: JSON.stringify(payload) }),

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
  completeRide: (bookingId: number) => request(`/driver/complete-ride/${bookingId}`, { method: "POST" }),
  declineRide: (bookingId: number) => request(`/driver/decline-ride/${bookingId}`, { method: "POST" }),
  cancelAcceptance: (bookingId: number) => request(`/driver/cancel-acceptance/${bookingId}`, { method: "POST" }),
  getBookingWithRide: (bookingId: number) => request(`/bookings/with-ride/${bookingId}`),
  submitRating: (rideId: number, payload: { score: number; comment?: string; compliments?: string[]; tipAmount?: number }) =>
    request(`/rides/${rideId}/rating`, { method: "POST", body: JSON.stringify(payload) }),
  getDriverRatings: (limit = 10): Promise<{
    averageRating: number | null;
    total: number;
    ratings: { id: number; rideId: number; score: number; comment: string | null; compliments?: string[]; createdAt: string; riderName: string | null; riderAvatar: string | null }[];
  }> => request(`/driver/ratings?limit=${limit}`),
  getDriverAcceptedRides: () => request(`/driver/accepted-rides`),
  getRecentBookings: () => request(`/bookings/my-recent`),
  getCompletedRides: () => request(`/bookings/my-completed`),
  getUpcomingRides: () => request(`/bookings/my-upcoming`),
  getActiveBooking: (): Promise<{
    booking: {
      id: number;
      status: string;
      pickupAddress: string;
      destination: string;
      bookingType?: string;
      hasDriver: boolean;
      rideStatus: string | null;
      driverName: string | null;
      vehicleModel: string | null;
      vehiclePlate: string | null;
    } | null;
  }> => request(`/bookings/my-active`),
  cancelBooking: (bookingId: number) =>
    request(`/bookings/${bookingId}/cancel`, { method: "POST" }),
  updateBookingPreferences: (
    bookingId: number,
    preferences: {
      languages: string[];
      ridePreferences: string[];
      specialRequest: string;
    }
  ) =>
    request(`/bookings/${bookingId}/preferences`, {
      method: "PATCH",
      body: JSON.stringify({ preferences })
    }),
  startScheduledRide: (bookingId: number) =>
    request(`/driver/start-scheduled-ride/${bookingId}`, { method: "POST" }),
  updateBookingPaymentMethod: (
    bookingId: number,
    payload: { method: PaymentMethodCode; label?: string }
  ) =>
    request(`/bookings/${bookingId}/payment-method`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  confirmBookingPayment: (
    bookingId: number,
    payload: { method?: PaymentMethodCode; label?: string; amount?: number } = {}
  ) =>
    request(`/bookings/${bookingId}/confirm-payment`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getRideMessages: (rideId: number): Promise<{ messages: RideMessage[] }> =>
    request(`/rides/${rideId}/messages`),
};
