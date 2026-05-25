import type { LocationSuggestion } from "./api";

const BOOKING_FLOW_KEY = "booking_flow_draft";
const LEGACY_BOOKING_KEY = "booking_draft";
const RECENT_COMPLETED_BOOKING_KEY = "recent_completed_booking";

export interface VehicleSummary {
  code: string;
  name: string;
  capacity: string;
  eta: string;
  price: string;
}

export interface BookingFlowDraft {
  entryPoint?: "booking" | "reservation";
  pickupText: string;
  destinationText: string;
  pickupSelection: LocationSuggestion | null;
  destinationSelection: LocationSuggestion | null;
  routeDistanceMeters?: number;
  routeDurationSeconds?: number;
  reservationDate?: string;
  reservationTime?: string;
  vehicle?: VehicleSummary | null;
  paymentMethodId?: string;
  paymentMethodLabel?: string;
  preferences?: {
    languages: string[];
    ridePreferences: string[];
    specialRequest: string;
  };
  bookingId?: number;
}

function parseDraft(raw: string | null): BookingFlowDraft | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getBookingFlowDraft(): BookingFlowDraft {
  const current = parseDraft(sessionStorage.getItem(BOOKING_FLOW_KEY));
  if (current) {
    return current;
  }

  const legacy = parseDraft(sessionStorage.getItem(LEGACY_BOOKING_KEY));
  if (legacy) {
    const migrated: BookingFlowDraft = {
      pickupText: legacy.pickup || "",
      destinationText: legacy.destination || "",
      pickupSelection: legacy.pickupSelection || null,
      destinationSelection: legacy.destinationSelection || null,
      bookingId: legacy.bookingId
    };
    saveBookingFlowDraft(migrated);
    return migrated;
  }

  return {
    pickupText: "",
    destinationText: "",
    pickupSelection: null,
    destinationSelection: null
  };
}

export function saveBookingFlowDraft(draft: BookingFlowDraft) {
  sessionStorage.setItem(BOOKING_FLOW_KEY, JSON.stringify(draft));
}

export function updateBookingFlowDraft(patch: Partial<BookingFlowDraft>) {
  const current = getBookingFlowDraft();
  saveBookingFlowDraft({
    ...current,
    ...patch
  });
}

export function clearBookingFlowDraft() {
  sessionStorage.removeItem(BOOKING_FLOW_KEY);
  sessionStorage.removeItem(LEGACY_BOOKING_KEY);
}

export function saveRecentCompletedBooking(booking: unknown) {
  const serialized = JSON.stringify(booking);
  sessionStorage.setItem(RECENT_COMPLETED_BOOKING_KEY, serialized);
  localStorage.setItem(RECENT_COMPLETED_BOOKING_KEY, serialized);
}

export function getRecentCompletedBooking<T = any>(): T | null {
  return (
    parseJson<T>(sessionStorage.getItem(RECENT_COMPLETED_BOOKING_KEY)) ||
    parseJson<T>(localStorage.getItem(RECENT_COMPLETED_BOOKING_KEY))
  );
}

export function clearRecentCompletedBooking() {
  sessionStorage.removeItem(RECENT_COMPLETED_BOOKING_KEY);
  localStorage.removeItem(RECENT_COMPLETED_BOOKING_KEY);
}

/** ISO datetime for SCHEDULED bookings (reservation flow). */
export function buildScheduledAtFromDraft(draft: BookingFlowDraft): string | undefined {
  if (!draft.reservationDate || !draft.reservationTime) {
    return undefined;
  }
  const base = new Date(draft.reservationDate);
  if (Number.isNaN(base.getTime())) {
    return undefined;
  }
  const [hours, minutes] = draft.reservationTime.split(":").map((part) => Number(part));
  base.setHours(hours || 0, minutes || 0, 0, 0);
  return base.toISOString();
}
