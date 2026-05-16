import { api } from "./api";

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  durationFare: number;
  totalFare: number;
}

const PRICING_BY_CLASS: Record<
  string,
  { baseFare: number; perKm: number; perMinute: number }
> = {
  economy: { baseFare: 20000, perKm: 9000, perMinute: 300 },
  comfort: { baseFare: 30000, perKm: 12000, perMinute: 400 },
  premium: { baseFare: 50000, perKm: 16000, perMinute: 600 }
};

/** Local fallback when API is unavailable (dev/offline). */
export function calculateFare(
  vehicleClassCode: string,
  distanceMeters: number,
  durationSeconds: number
): FareBreakdown {
  const config = PRICING_BY_CLASS[vehicleClassCode] || PRICING_BY_CLASS.economy;
  const distanceKm = Math.max(0, distanceMeters) / 1000;
  const durationMinutes = Math.max(0, durationSeconds) / 60;
  const distanceFare = Math.round(distanceKm * config.perKm);
  const durationFare = Math.round(durationMinutes * config.perMinute);
  const totalFare = config.baseFare + distanceFare + durationFare;
  return {
    baseFare: config.baseFare,
    distanceFare,
    durationFare,
    totalFare
  };
}

/** Preferred: server fare from VehicleClass in database. */
export async function fetchFareEstimate(
  vehicleClassCode: string,
  distanceMeters: number,
  durationSeconds: number
): Promise<FareBreakdown> {
  try {
    const { fare } = await api.estimatePricing({
      vehicleClassCode,
      distanceMeters,
      durationSeconds
    });
    return {
      baseFare: fare.baseFare,
      distanceFare: fare.distanceFare,
      durationFare: fare.durationFare,
      totalFare: fare.totalFare
    };
  } catch {
    return calculateFare(vehicleClassCode, distanceMeters, durationSeconds);
  }
}

export function formatVnd(amount: number) {
  return `${amount.toLocaleString("en-US")} VND`;
}
