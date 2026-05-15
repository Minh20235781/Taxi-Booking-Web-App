-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "Payment" ADD COLUMN "provider" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "city" TEXT;
ALTER TABLE "User" ADD COLUMN "country" TEXT;

-- CreateTable
CREATE TABLE "SavedPaymentMethod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "last4" TEXT,
    "provider" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rideId" INTEGER NOT NULL,
    "senderUserId" INTEGER NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "translatedBody" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "bookingType" TEXT NOT NULL DEFAULT 'INSTANT',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "pickupAddress" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "pickupPlaceId" TEXT,
    "destinationPlaceId" TEXT,
    "pickupLat" REAL,
    "pickupLng" REAL,
    "destinationLat" REAL,
    "destinationLng" REAL,
    "scheduledAt" DATETIME,
    "routeDistanceMeters" INTEGER,
    "routeDurationSeconds" INTEGER,
    "vehicleClassId" INTEGER NOT NULL,
    "estimatedFare" REAL,
    "paymentMethod" TEXT,
    "paymentMethodLabel" TEXT,
    "preferencesJson" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "VehicleClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "destination", "destinationLat", "destinationLng", "estimatedFare", "id", "pickupAddress", "pickupLat", "pickupLng", "status", "updatedAt", "userId", "vehicleClassId") SELECT "createdAt", "destination", "destinationLat", "destinationLng", "estimatedFare", "id", "pickupAddress", "pickupLat", "pickupLng", "status", "updatedAt", "userId", "vehicleClassId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_bookingType_idx" ON "Booking"("bookingType");
CREATE INDEX "Booking_scheduledAt_idx" ON "Booking"("scheduledAt");
CREATE TABLE "new_DriverProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "licenseNumber" TEXT,
    "vehiclePlate" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" TEXT,
    "vehicleColor" TEXT,
    "identificationNumber" TEXT,
    "languages" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountHolderName" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentLat" REAL,
    "currentLng" REAL,
    "averageRating" REAL,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DriverProfile" ("createdAt", "currentLat", "currentLng", "id", "isOnline", "licenseNumber", "updatedAt", "userId", "vehicleModel", "vehiclePlate") SELECT "createdAt", "currentLat", "currentLng", "id", "isOnline", "licenseNumber", "updatedAt", "userId", "vehicleModel", "vehiclePlate" FROM "DriverProfile";
DROP TABLE "DriverProfile";
ALTER TABLE "new_DriverProfile" RENAME TO "DriverProfile";
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE TABLE "new_Ride" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingId" INTEGER NOT NULL,
    "riderId" INTEGER NOT NULL,
    "driverProfileId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "acceptedAt" DATETIME,
    "driverEnRouteAt" DATETIME,
    "arrivedAt" DATETIME,
    "startedAt" DATETIME,
    "endTime" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "finalFare" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ride_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ride_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ride_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ride" ("bookingId", "createdAt", "driverProfileId", "endTime", "finalFare", "id", "riderId", "status", "updatedAt") SELECT "bookingId", "createdAt", "driverProfileId", "endTime", "finalFare", "id", "riderId", "status", "updatedAt" FROM "Ride";
DROP TABLE "Ride";
ALTER TABLE "new_Ride" RENAME TO "Ride";
CREATE UNIQUE INDEX "Ride_bookingId_key" ON "Ride"("bookingId");
CREATE INDEX "Ride_status_idx" ON "Ride"("status");
CREATE INDEX "Ride_driverProfileId_idx" ON "Ride"("driverProfileId");
CREATE INDEX "Ride_riderId_idx" ON "Ride"("riderId");
CREATE TABLE "new_VehicleClass" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseFare" REAL NOT NULL,
    "pricePerKm" REAL NOT NULL,
    "pricePerMinute" REAL NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_VehicleClass" ("baseFare", "code", "createdAt", "id", "maxCapacity", "name", "pricePerKm", "updatedAt") SELECT "baseFare", "code", "createdAt", "id", "maxCapacity", "name", "pricePerKm", "updatedAt" FROM "VehicleClass";
DROP TABLE "VehicleClass";
ALTER TABLE "new_VehicleClass" RENAME TO "VehicleClass";
CREATE UNIQUE INDEX "VehicleClass_code_key" ON "VehicleClass"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SavedPaymentMethod_userId_idx" ON "SavedPaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "Message_rideId_idx" ON "Message"("rideId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalId_key" ON "Payment"("externalId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

