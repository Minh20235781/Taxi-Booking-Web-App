import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import {
  fetchNominatimSuggestions,
  fetchPhotonSuggestions,
  mergeAndDedupeSuggestions
} from "./geo/providers.js";
import { normalizeSearchInput } from "./geo/normalize.js";
import { fetchRoutePreview } from "./geo/routing.js";
import { calculateFareFromVehicleClass } from "./services/pricing.js";
import {
  buildBookingCreateData,
  normalizeBookingPayload,
  validateBookingPayload
} from "./services/bookingPayload.js";

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

app.use(cors());

// SỬA LỖI 2: Tăng giới hạn dung lượng nhận dữ liệu lên 10MB để thoải mái nhận chuỗi ảnh Base64 từ Frontend
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const modelMap = {
  users: "user",
  driverProfiles: "driverProfile",
  vehicleClasses: "vehicleClass",
  bookings: "booking",
  rides: "ride",
  payments: "payment",
  ratings: "rating",
  messages: "message",
  savedPaymentMethods: "savedPaymentMethod"
};

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/auth/signup", async (req, res) => {
  const { fullName, email, phone, password, role } = req.body;
  if (!fullName || !email || !phone || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (!["USER", "DRIVER"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  const existed = await prisma.user.findUnique({ where: { email } });
  if (existed) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { fullName, email, phone, passwordHash, role }
  });

  if (role === "DRIVER") {
    await prisma.driverProfile.create({
      data: { userId: user.id }
    });
  }

  const safe = safeUser(user);
  const token = signToken(safe);
  return res.status(201).json({ user: safe, token });
});

app.post("/auth/login", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: "Missing email/password/role" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== role) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const safe = safeUser(user);
  const token = signToken(safe);
  return res.json({ user: safe, token });
});

app.get("/auth/me", authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.auth.sub) }
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json({ user: safeUser(user) });
});

app.get("/locations/suggest", async (req, res) => {
  const q = normalizeSearchInput(req.query.q);
  const limit = Math.min(Number(req.query.limit || 5), 5);
  if (!q) {
    return res.json({ suggestions: [] });
  }
  try {
    const photonSuggestions = await fetchPhotonSuggestions(q, limit);
    let nominatimSuggestions = [];
    if (photonSuggestions.length < limit) {
      nominatimSuggestions = await fetchNominatimSuggestions(q, limit);
    }
    const suggestions = mergeAndDedupeSuggestions(photonSuggestions, nominatimSuggestions).slice(
      0,
      limit
    );
    return res.json({ suggestions });
  } catch (error) {
    try {
      const fallback = await fetchNominatimSuggestions(q, limit);
      const suggestions = mergeAndDedupeSuggestions(fallback).slice(0, limit);
      return res.json({ suggestions });
    } catch {
      return res.json({ suggestions: [] });
    }
  }
});

app.post("/pricing/estimate", async (req, res) => {
  const { vehicleClassCode, distanceMeters, durationSeconds, from, to } = req.body || {};
  const code = String(vehicleClassCode || "").trim();
  if (!code) {
    return res.status(400).json({ message: "vehicleClassCode is required" });
  }

  const vehicleClass = await prisma.vehicleClass.findUnique({ where: { code } });
  if (!vehicleClass) {
    return res.status(404).json({ message: "Vehicle class not found" });
  }

  let distance = Number(distanceMeters);
  let duration = Number(durationSeconds);

  if (from?.lat != null && from?.lon != null && to?.lat != null && to?.lon != null) {
    try {
      const route = await fetchRoutePreview({
        from: { lat: Number(from.lat), lon: Number(from.lon) },
        to: { lat: Number(to.lat), lon: Number(to.lon) }
      });
      distance = route.distance;
      duration = route.duration;
    } catch {
      return res.status(404).json({ message: "Could not fetch route for fare estimate" });
    }
  }

  if (
    !Number.isFinite(distance) ||
    !Number.isFinite(duration) ||
    distance < 0 ||
    duration < 0
  ) {
    return res.status(400).json({
      message: "Provide distanceMeters and durationSeconds, or valid from/to coordinates"
    });
  }

  const fare = calculateFareFromVehicleClass(vehicleClass, distance, duration);
  return res.json({ fare });
});

app.post("/routes/preview", async (req, res) => {
  const { from, to } = req.body || {};
  const fromLat = Number(from?.lat);
  const fromLon = Number(from?.lon);
  const toLat = Number(to?.lat);
  const toLon = Number(to?.lon);
  if (
    Number.isNaN(fromLat) ||
    Number.isNaN(fromLon) ||
    Number.isNaN(toLat) ||
    Number.isNaN(toLon)
  ) {
    return res.status(400).json({ message: "Invalid route coordinates" });
  }
  try {
    const route = await fetchRoutePreview({
      from: { lat: fromLat, lon: fromLon },
      to: { lat: toLat, lon: toLon }
    });
    return res.json(route);
  } catch (error) {
    return res.status(404).json({ message: "Could not fetch route preview" });
  }
});

app.post("/bookings/create-flow", authRequired, async (req, res) => {
  let payload;
  try {
    payload = normalizeBookingPayload(req.body);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Invalid booking payload"
    });
  }

  const validationError = validateBookingPayload(payload);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const vehicleClass = await prisma.vehicleClass.findUnique({
    where: { code: payload.vehicleClassCode }
  });
  if (!vehicleClass) {
    return res.status(404).json({ message: "Vehicle class not found" });
  }

  let estimatedFare = payload.estimatedFare;
  if (
    estimatedFare == null &&
    payload.routeDistanceMeters != null &&
    payload.routeDurationSeconds != null
  ) {
    estimatedFare = calculateFareFromVehicleClass(
      vehicleClass,
      payload.routeDistanceMeters,
      payload.routeDurationSeconds
    ).totalFare;
  }

  const booking = await prisma.booking.create({
    data: buildBookingCreateData(
      Number(req.auth.sub),
      vehicleClass.id,
      payload,
      estimatedFare ?? null
    ),
    include: { vehicleClass: true }
  });

  return res.status(201).json({
    booking,
    fare:
      estimatedFare != null
        ? calculateFareFromVehicleClass(
            vehicleClass,
            payload.routeDistanceMeters || 0,
            payload.routeDurationSeconds || 0
          )
        : null
  });
});

app.put("/driver/profile", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const data = req.body;

  try {
    const driverProfile = await prisma.driverProfile.update({
      where: { userId },
      data: {
        licenseNumber: data.licenseNumber,
        vehiclePlate: data.vehiclePlate,
        vehicleModel: data.vehicleModel,
        vehicleYear: data.vehicleYear,
        vehiclePhotoUrl: data.vehiclePhotoUrl,
        vehicleColor: data.vehicleColor,
        identificationNumber: data.identificationNumber,
        languages: data.languages,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        isOnline: data.isOnline
      }
    });

    if (data.user) {
      // SỬA LỖI 1: Thay đổi 'name' thành 'fullName' để khớp hoàn chỉnh dữ liệu Prisma Schema
      await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: data.user.fullName || data.user.name, 
          email: data.user.email,
          phone: data.user.phone,
          address: data.user.address,                     // THÊM: Lưu địa chỉ vào DB
          city: data.user.city,                           // THÊM: Lưu thành phố vào DB
          country: data.user.country,
          avatarUrl: data.user.avatarUrl
        }
      });
    }

    // Nếu có đổi mật khẩu
    if (data.currentPassword && data.newPassword) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const match = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!match) {
        return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác." });
      }
      const newPasswordHash = await bcrypt.hash(data.newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });
    }

    res.json({ message: "Profile updated successfully.", driverProfile });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "Driver profile not found." });
    }
    console.error("Error updating driver profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/driver/profile", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  try {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found." });
    }
    res.json(driverProfile);
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/driver/pending-requests", authRequired, async (req, res) => {
  try {
    const userId = Number(req.auth.sub);
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId } });
    const driverProfileId = driverProfile ? driverProfile.id : null;
    // Parse driver languages (stored as JSON string or comma-separated)
    let driverLangs = [];
    if (driverProfile?.languages) {
      try {
        const parsed = JSON.parse(driverProfile.languages);
        if (Array.isArray(parsed)) driverLangs = parsed;
      } catch {
        // fallback: comma separated
        driverLangs = String(driverProfile.languages).split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    // Build language filter: include bookings that either have no language requirement
    // or whose preferencesJson contains at least one language the driver speaks.
    const langFilters = driverLangs.length
      ? driverLangs.map((lang) => ({ preferencesJson: { contains: `"${lang}"` } }))
      : [];

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["REQUESTED", "SCHEDULED"] },
        NOT: driverProfileId
          ? {
              declinedRides: {
                some: { driverProfileId }
              }
            }
          : undefined,
        AND: langFilters.length
          ? {
              OR: [{ preferencesJson: null }, ...langFilters]
            }
          : undefined
      },
      include: { user: true, vehicleClass: true },
      orderBy: [
        { scheduledAt: "asc" },
        { createdAt: "desc" }
      ]
    });
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Return booking with its ride and assigned driver (if any)
app.get("/bookings/with-ride/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        vehicleClass: true,
        ride: {
          include: {
            driver: { include: { user: true } }
          }
        }
      }
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking with ride:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/driver/accept-ride/:bookingId", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const bookingId = Number(req.params.bookingId);

  try {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId }
    });
    
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found." });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.status !== "REQUESTED") {
      return res.status(400).json({ message: "Booking is no longer available." });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "ACCEPTED" }
    });

    const ride = await prisma.ride.create({
      data: {
        bookingId,
        riderId: booking.userId,
        driverProfileId: driverProfile.id,
        status: "ACCEPTED",
        acceptedAt: new Date()
      }
    });

    res.json({ message: "Ride accepted successfully.", booking: updatedBooking, ride });
  } catch (error) {
    console.error("Error accepting ride:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

Object.entries(modelMap).forEach(([routeName, modelName]) => {
  app.get(`/crud/${routeName}`, authRequired, async (_req, res) => {
    const data = await prisma[modelName].findMany();
    res.json({ data });
  });

  app.get(`/crud/${routeName}/:id`, authRequired, async (req, res) => {
    const data = await prisma[modelName].findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!data) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json({ data });
  });

  app.post(`/crud/${routeName}`, authRequired, async (req, res) => {
    const data = await prisma[modelName].create({ data: req.body });
    res.status(201).json({ data });
  });

  app.put(`/crud/${routeName}/:id`, authRequired, async (req, res) => {
    const data = await prisma[modelName].update({
      where: { id: Number(req.params.id) },
      data: req.body
    });
    res.json({ data });
  });

  app.delete(`/crud/${routeName}/:id`, authRequired, async (req, res) => {
    await prisma[modelName].delete({
      where: { id: Number(req.params.id) }
    });
    res.status(204).send();
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});

app.post("/driver/decline-ride/:bookingId", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const bookingId = Number(req.params.bookingId);
  try {
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found." });
    }

    // Create declined record (unique constraint prevents duplicates)
    await prisma.declinedRide.upsert({
      where: { bookingId_driverProfileId: { bookingId, driverProfileId: driverProfile.id } },
      update: {},
      create: { bookingId, driverProfileId: driverProfile.id }
    });

    return res.json({ message: "Ride declined for this driver." });
  } catch (error) {
    console.error("Error declining ride:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user's recent bookings (for recent destinations display)
app.get("/bookings/my-recent", authRequired, async (req, res) => {
  try {
    const userId = Number(req.auth.sub);
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: { vehicleClass: true },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    const mapped = bookings.map((b) => {
      const when = b.scheduledAt || b.createdAt;
      const dateStr = when ? new Date(when).toISOString().slice(0, 10) : "";
      const fareStr = b.estimatedFare ? `${Math.round(b.estimatedFare).toLocaleString()} VND` : "-";
      
      return {
        id: b.id,
        destination: b.destination,
        date: dateStr,
        price: fareStr,
        pickup: b.pickupAddress,
        status: b.status
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching recent bookings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user's completed rides (with driver info and rating)
app.get("/bookings/my-completed", authRequired, async (req, res) => {
  try {
    const userId = Number(req.auth.sub);
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: { in: ["COMPLETED", "CANCELLED"] }
      },
      include: {
        ride: {
          include: {
            driver: { include: { user: true } }
          }
        },
        vehicleClass: true
      },
      orderBy: { createdAt: "desc" }
    });

    const mapped = bookings.map((b) => {
      const when = b.scheduledAt || b.createdAt;
      const dateObj = when ? new Date(when) : new Date();
      const dateStr = dateObj.toISOString().slice(0, 10);
      const timeStr = dateObj.toTimeString().slice(0, 5);
      const fareStr = b.estimatedFare ? `${Math.round(b.estimatedFare).toLocaleString()} VND` : "-";
      
      const driverName = b.ride?.driver?.user?.fullName || "Driver";
      const driverRating = b.ride?.driver?.averageRating || 5;
      
      return {
        id: b.id,
        driver: driverName,
        from: b.pickupAddress,
        to: b.destination,
        date: dateStr,
        time: timeStr,
        price: fareStr,
        rating: driverRating,
        status: b.status
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching completed rides:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user's upcoming rides (scheduled bookings)
app.get("/bookings/my-upcoming", authRequired, async (req, res) => {
  try {
    const userId = Number(req.auth.sub);
    const now = new Date();
    
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        bookingType: "SCHEDULED",
        scheduledAt: { gt: now }
      },
      include: {
        vehicleClass: true,
        ride: { include: { driver: { include: { user: true } } } }
      },
      orderBy: { scheduledAt: "asc" }
    });

    const mapped = bookings.map((b) => {
      const dateObj = b.scheduledAt ? new Date(b.scheduledAt) : new Date();
      const dateStr = dateObj.toISOString().slice(0, 10);
      const timeStr = dateObj.toTimeString().slice(0, 5);
      const vehicleType = b.vehicleClass?.name?.toLowerCase() || "economy";
      
      return {
        id: b.id,
        from: b.pickupAddress,
        to: b.destination,
        date: dateStr,
        time: timeStr,
        vehicle: vehicleType,
        status: b.ride?.status || "PENDING"
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching upcoming rides:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get accepted (and active) rides for the authenticated driver
app.get("/driver/accepted-rides", authRequired, async (req, res) => {
  try {
    const userId = Number(req.auth.sub);
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found." });
    }

    const rides = await prisma.ride.findMany({
      where: {
        driverProfileId: driverProfile.id,
        status: { in: ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "IN_PROGRESS"] }
      },
      include: {
        booking: { include: { user: true, vehicleClass: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const mapped = rides.map((r) => {
      const b = r.booking;
      const when = b.scheduledAt || b.createdAt;
      const dateStr = when ? new Date(when).toISOString().slice(0, 10) : "";
      const timeStr = when ? new Date(when).toISOString().slice(11, 16) : "";

      let prefs = [];
      let langs = [];
      if (b.preferencesJson) {
        try {
          const parsed = JSON.parse(b.preferencesJson);
          if (Array.isArray(parsed.languages)) langs = parsed.languages;
          if (Array.isArray(parsed.ridePreferences)) prefs = parsed.ridePreferences;
        } catch {
          // ignore
        }
      }

      return {
        id: String(b.id),
        date: dateStr,
        time: timeStr,
        customerName: b.user?.fullName || "",
        customerAvatar: b.user?.avatarUrl || null,
        customerRating: b.user?.averageRating || 0,
        pickup: b.pickupAddress,
        destination: b.destination,
        distance: b.routeDistanceMeters ? `${Math.round(b.routeDistanceMeters / 1000)} km` : "",
        duration: b.routeDurationSeconds ? String(Math.round(b.routeDurationSeconds / 60)) : "",
        earnings: b.estimatedFare ? String(Math.round(b.estimatedFare)) : "",
        languages: langs,
        preferences: prefs,
        specialRequest: null
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching accepted rides:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});