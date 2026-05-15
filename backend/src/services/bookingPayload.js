import { BOOKING_STATUS, BOOKING_TYPE } from "../constants/status.js";

function parseOptionalFloat(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

export function normalizeBookingPayload(body) {
  const pickupAddress = String(body.pickupAddress || "").trim();
  const destination = String(body.destination || "").trim();
  const vehicleClassCode = String(body.vehicleClassCode || "").trim();
  const bookingType =
    body.bookingType === BOOKING_TYPE.SCHEDULED ? BOOKING_TYPE.SCHEDULED : BOOKING_TYPE.INSTANT;

  let scheduledAt;
  if (body.scheduledAt) {
    const parsed = new Date(body.scheduledAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid scheduledAt");
    }
    scheduledAt = parsed;
  }

  let preferencesJson;
  if (body.preferencesJson !== undefined && body.preferencesJson !== null) {
    preferencesJson =
      typeof body.preferencesJson === "string"
        ? body.preferencesJson
        : JSON.stringify(body.preferencesJson);
  } else if (body.preferences !== undefined && body.preferences !== null) {
    preferencesJson = JSON.stringify(body.preferences);
  }

  const status =
    bookingType === BOOKING_TYPE.SCHEDULED ? BOOKING_STATUS.SCHEDULED : BOOKING_STATUS.REQUESTED;

  return {
    pickupAddress,
    destination,
    vehicleClassCode,
    bookingType,
    status,
    scheduledAt: bookingType === BOOKING_TYPE.SCHEDULED ? scheduledAt : undefined,
    pickupPlaceId: body.pickupPlaceId ? String(body.pickupPlaceId) : undefined,
    destinationPlaceId: body.destinationPlaceId ? String(body.destinationPlaceId) : undefined,
    pickupLat: parseOptionalFloat(body.pickupLat),
    pickupLng: parseOptionalFloat(body.pickupLng),
    destinationLat: parseOptionalFloat(body.destinationLat),
    destinationLng: parseOptionalFloat(body.destinationLng),
    routeDistanceMeters: parseOptionalInt(body.routeDistanceMeters),
    routeDurationSeconds: parseOptionalInt(body.routeDurationSeconds),
    paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined,
    paymentMethodLabel: body.paymentMethodLabel ? String(body.paymentMethodLabel) : undefined,
    preferencesJson,
    estimatedFare: parseOptionalFloat(body.estimatedFare)
  };
}

export function validateBookingPayload(payload) {
  if (!payload.pickupAddress || !payload.destination || !payload.vehicleClassCode) {
    return "Missing pickupAddress, destination, or vehicleClassCode";
  }
  if (payload.bookingType === BOOKING_TYPE.SCHEDULED && !payload.scheduledAt) {
    return "scheduledAt is required for SCHEDULED bookings";
  }
  return null;
}

export function buildBookingCreateData(userId, vehicleClassId, payload, estimatedFare) {
  return {
    userId,
    vehicleClassId,
    pickupAddress: payload.pickupAddress,
    destination: payload.destination,
    bookingType: payload.bookingType,
    status: payload.status,
    scheduledAt: payload.scheduledAt ?? null,
    pickupPlaceId: payload.pickupPlaceId ?? null,
    destinationPlaceId: payload.destinationPlaceId ?? null,
    pickupLat: payload.pickupLat ?? null,
    pickupLng: payload.pickupLng ?? null,
    destinationLat: payload.destinationLat ?? null,
    destinationLng: payload.destinationLng ?? null,
    routeDistanceMeters: payload.routeDistanceMeters ?? null,
    routeDurationSeconds: payload.routeDurationSeconds ?? null,
    paymentMethod: payload.paymentMethod ?? null,
    paymentMethodLabel: payload.paymentMethodLabel ?? null,
    preferencesJson: payload.preferencesJson ?? null,
    estimatedFare
  };
}
