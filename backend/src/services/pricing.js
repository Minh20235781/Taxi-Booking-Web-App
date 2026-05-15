/**
 * Fare = baseFare + (km * pricePerKm) + (minutes * pricePerMinute)
 * Uses VehicleClass row from the database.
 */
export function calculateFareFromVehicleClass(vehicleClass, distanceMeters, durationSeconds) {
  const distanceKm = Math.max(0, Number(distanceMeters) || 0) / 1000;
  const durationMinutes = Math.max(0, Number(durationSeconds) || 0) / 60;
  const baseFare = vehicleClass.baseFare;
  const distanceFare = Math.round(distanceKm * vehicleClass.pricePerKm);
  const durationFare = Math.round(durationMinutes * (vehicleClass.pricePerMinute || 0));
  const totalFare = Math.round(baseFare + distanceFare + durationFare);

  return {
    vehicleClassCode: vehicleClass.code,
    baseFare,
    distanceFare,
    durationFare,
    totalFare,
    distanceMeters: Math.round(Number(distanceMeters) || 0),
    durationSeconds: Math.round(Number(durationSeconds) || 0)
  };
}
