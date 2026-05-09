import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const vehicleClasses = [
    { code: "economy", name: "Economy", baseFare: 20000, pricePerKm: 10000, maxCapacity: 4 },
    { code: "comfort", name: "Comfort", baseFare: 30000, pricePerKm: 14000, maxCapacity: 4 },
    { code: "premium", name: "Premium", baseFare: 50000, pricePerKm: 20000, maxCapacity: 4 }
  ];

  for (const item of vehicleClasses) {
    await prisma.vehicleClass.upsert({
      where: { code: item.code },
      update: item,
      create: item
    });
  }

  const passwordHash = await bcrypt.hash("Password@123", 10);

  await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      fullName: "Demo User",
      email: "user@example.com",
      phone: "0900000001",
      passwordHash,
      role: "USER"
    }
  });

  const driverUser = await prisma.user.upsert({
    where: { email: "driver@example.com" },
    update: {},
    create: {
      fullName: "Demo Driver",
      email: "driver@example.com",
      phone: "0900000002",
      passwordHash,
      role: "DRIVER"
    }
  });

  await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      licenseNumber: "DL-123456",
      vehiclePlate: "30A-123.45",
      vehicleModel: "Toyota Vios",
      isOnline: true,
      currentLat: 21.0278,
      currentLng: 105.8342
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
