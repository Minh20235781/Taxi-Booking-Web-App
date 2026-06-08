/** Normalize GET /driver/profile response (flat Prisma object with nested user). */

export interface DriverProfileView {
  user: {
    fullName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  driverProfile: {
    id?: number;
    userId?: number;
    vehicleModel?: string | null;
    vehiclePlate?: string | null;
    vehicleYear?: string | null;
    vehicleColor?: string | null;
    vehiclePhotoUrl?: string | null;
    languages?: string | null;
    isOnline?: boolean;
    averageRating?: number | null;
    totalTrips?: number;
  } | null;
}

export function normalizeDriverProfileResponse(response: unknown): DriverProfileView | null {
  const data = (response as { data?: unknown })?.data ?? response;
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  const nestedUser = record.user as DriverProfileView["user"];
  const nestedDriver = record.driverProfile as DriverProfileView["driverProfile"];

  if (nestedDriver && nestedUser) {
    return { user: nestedUser, driverProfile: nestedDriver };
  }

  if (nestedUser || record.userId != null || record.vehicleModel != null) {
    return {
      user: nestedUser ?? null,
      driverProfile: record as DriverProfileView["driverProfile"]
    };
  }

  return null;
}
