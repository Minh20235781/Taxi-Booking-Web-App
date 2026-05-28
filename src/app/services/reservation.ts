/** Shared helpers for SCHEDULED booking flows (user + driver). */

export type ReservationPhase =
  | "waiting_driver"
  | "driver_assigned"
  | "driver_en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ReservationBookingView {
  id: number;
  status: string;
  bookingType?: string;
  scheduledAt?: string | null;
  pickupAddress?: string;
  destination?: string;
  estimatedFare?: number | null;
  paymentMethodLabel?: string | null;
  ride?: {
    id: number;
    status: string;
    driver?: {
      user?: { fullName?: string; avatarUrl?: string | null; phone?: string };
    };
  } | null;
}

export function getReservationPhase(booking: ReservationBookingView): ReservationPhase {
  if (booking.status === "CANCELLED") return "cancelled";
  if (booking.status === "COMPLETED") return "completed";
  const rideStatus = booking.ride?.status;
  if (rideStatus === "IN_PROGRESS" || rideStatus === "ARRIVED") return "in_progress";
  if (rideStatus === "DRIVER_EN_ROUTE") return "driver_en_route";
  if (booking.ride || booking.status === "ACCEPTED") return "driver_assigned";
  return "waiting_driver";
}

export function formatScheduledLocal(scheduledAt?: string | null, locale = "ja-JP") {
  if (!scheduledAt) return { date: "-", time: "-", datetime: "-" };
  const d = new Date(scheduledAt);
  return {
    date: d.toLocaleDateString(locale),
    time: d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
    datetime: d.toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short"
    })
  };
}

export function canStartScheduledPickup(scheduledAt?: string | null) {
  if (!scheduledAt) return true;
  const start = new Date(scheduledAt).getTime();
  return start - Date.now() <= 30 * 60 * 1000;
}

export function minutesUntilScheduled(scheduledAt?: string | null) {
  if (!scheduledAt) return null;
  return Math.round((new Date(scheduledAt).getTime() - Date.now()) / 60000);
}
