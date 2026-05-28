-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN "idCardBackUrl" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN "idCardFrontUrl" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN "languageCertificationUrl" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN "licensePhotoUrl" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN "vehiclePhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "DeclinedRide" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingId" INTEGER NOT NULL,
    "driverProfileId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeclinedRide_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeclinedRide_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeclinedRide_bookingId_idx" ON "DeclinedRide"("bookingId");

-- CreateIndex
CREATE INDEX "DeclinedRide_driverProfileId_idx" ON "DeclinedRide"("driverProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "DeclinedRide_bookingId_driverProfileId_key" ON "DeclinedRide"("bookingId", "driverProfileId");
