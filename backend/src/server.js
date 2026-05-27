import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { createServer } from "http";
import { Server } from "socket.io";

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
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || "";

const DEFAULT_VEHICLE_CLASSES = [
  {
    code: "economy",
    name: "Economy",
    baseFare: 20000,
    pricePerKm: 9000,
    pricePerMinute: 300,
    maxCapacity: 4
  },
  {
    code: "comfort",
    name: "Comfort",
    baseFare: 30000,
    pricePerKm: 12000,
    pricePerMinute: 400,
    maxCapacity: 4
  },
  {
    code: "premium",
    name: "Premium",
    baseFare: 50000,
    pricePerKm: 16000,
    pricePerMinute: 600,
    maxCapacity: 4
  }
];

app.use(cors());

// SỬA LỖI 2: Tăng giới hạn dung lượng nhận dữ liệu lên 10MB để thoải mái nhận chuỗi ảnh Base64 từ Frontend
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Cấu hình multer cho upload ảnh
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  }
});

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

async function ensureDefaultVehicleClasses() {
  await Promise.all(
    DEFAULT_VEHICLE_CLASSES.map((vehicleClass) =>
      prisma.vehicleClass.upsert({
        where: { code: vehicleClass.code },
        update: vehicleClass,
        create: vehicleClass
      })
    )
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

function formatMessage(message) {
  return {
    id: message.id,
    rideId: message.rideId,
    senderUserId: message.senderUserId,
    senderRole: message.senderRole,
    body: message.body,
    translatedBody: message.translatedBody,
    createdAt: message.createdAt
  };
}

function normalizePaymentMethod(method) {
  const normalized = String(method || "").trim().toUpperCase();
  if (["MOMO", "CASH", "CARD"].includes(normalized)) {
    return normalized;
  }
  return null;
}

/** Driver may start pickup within 30 minutes before scheduled time. */
function canStartScheduledRide(scheduledAt) {
  if (!scheduledAt) {
    return true;
  }
  const start = new Date(scheduledAt).getTime();
  return start - Date.now() <= 30 * 60 * 1000;
}

function parsePreferencesJson(raw) {
  if (!raw) {
    return { languages: [], ridePreferences: [], specialRequest: "" };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      languages: Array.isArray(parsed.languages) ? parsed.languages : [],
      ridePreferences: Array.isArray(parsed.ridePreferences) ? parsed.ridePreferences : [],
      specialRequest: typeof parsed.specialRequest === "string" ? parsed.specialRequest : ""
    };
  } catch {
    return { languages: [], ridePreferences: [], specialRequest: "" };
  }
}

function paymentMethodLabel(method, fallbackLabel) {
  if (fallbackLabel) {
    return String(fallbackLabel);
  }
  if (method === "MOMO") {
    return "MoMo";
  }
  if (method === "CASH") {
    return "Cash";
  }
  return "Card";
}

async function ensureRideForBooking(booking) {
  if (booking.ride) {
    return booking.ride;
  }

  const driverProfile = await prisma.driverProfile.findFirst({
    where: { isOnline: true }
  });

  return prisma.ride.create({
    data: {
      bookingId: booking.id,
      riderId: booking.userId,
      driverProfileId: driverProfile?.id,
      status: "COMPLETED",
      startedAt: new Date(),
      endTime: new Date(),
      finalFare: booking.estimatedFare ?? 0
    }
  });
}

function getViJaTranslationPair(text) {
  const hasJapanese = /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
  return hasJapanese
    ? { source: "ja", target: "vi" }
    : { source: "vi", target: "ja" };
}

async function translateViJa(text) {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    return null;
  }

  const { source, target } = getViJaTranslationPair(text);
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(
      GOOGLE_TRANSLATE_API_KEY
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: "text"
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Google Translate failed with status ${response.status}`);
  }

  const data = await response.json();
  return data?.data?.translations?.[0]?.translatedText || null;
}

async function ensureDemoRide(rideId) {
  const rider = await prisma.user.findUnique({ where: { email: "user@example.com" } });
  const driverUser = await prisma.user.findUnique({ where: { email: "driver@example.com" } });
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (rideId !== 1) {
    return ride;
  }
  if (!rider) {
    return null;
  }

  const vehicleClass = await prisma.vehicleClass.findFirst();
  if (!vehicleClass) {
    return null;
  }

  const driverProfile = driverUser
    ? await prisma.driverProfile.findUnique({ where: { userId: driverUser.id } })
    : await prisma.driverProfile.findFirst();
  if (ride) {
    if (ride.riderId !== rider.id || ride.driverProfileId !== driverProfile?.id) {
      await prisma.booking.update({
        where: { id: ride.bookingId },
        data: {
          userId: rider.id,
          status: "ASSIGNED"
        }
      });
      return prisma.ride.update({
        where: { id: ride.id },
        data: {
          riderId: rider.id,
          driverProfileId: driverProfile?.id,
          status: "IN_PROGRESS",
          startedAt: ride.startedAt || new Date()
        }
      });
    }
    return ride;
  }

  const booking = await prisma.booking.create({
    data: {
      userId: rider.id,
      pickupAddress: "Demo pickup",
      destination: "Demo destination",
      vehicleClassId: vehicleClass.id,
      status: "ASSIGNED"
    }
  });

  return prisma.ride.create({
    data: {
      id: rideId,
      bookingId: booking.id,
      riderId: rider.id,
      driverProfileId: driverProfile?.id,
      status: "IN_PROGRESS",
      startedAt: new Date()
    }
  });
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

// Update user profile (for regular users)
app.put("/user/profile", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const data = req.body || {};
  try {
    const allowed = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      avatarUrl: data.avatarUrl
    };

    const updated = await prisma.user.update({ where: { id: userId }, data: allowed });
    return res.json({ user: safeUser(updated) });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
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

app.get("/rides/:rideId/messages", authRequired, async (req, res) => {
  const rideId = Number(req.params.rideId);
  if (!Number.isInteger(rideId) || rideId <= 0) {
    return res.status(400).json({ message: "Invalid ride id" });
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    return res.status(404).json({ message: "Ride not found" });
  }

  const messages = await prisma.message.findMany({
    where: { rideId },
    orderBy: { createdAt: "asc" }
  });
  return res.json({ messages: messages.map(formatMessage) });
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

function stripEmptyFields(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

app.put("/driver/profile", authRequired, upload.fields([
  { name: 'vehiclePhoto', maxCount: 1 },
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 },
  { name: 'licensePhoto', maxCount: 1 },
  { name: 'languageCertification', maxCount: 1 }
]), async (req, res) => {
  const userId = Number(req.auth.sub);
  if (req.auth.role !== "DRIVER") {
    return res.status(403).json({ message: "Driver account required" });
  }
  const data = req.body;

  try {
    // Parse JSON fields từ FormData
    let userDataToUpdate = null;
    if (data.user) {
      try {
        userDataToUpdate = JSON.parse(data.user);
      } catch (e) {
        userDataToUpdate = data.user;
      }
    }

    // Hàm chuyển file sang base64 URL
    const fileToBase64 = (file) => {
      if (!file) return null;
      const base64 = file.buffer.toString('base64');
      const mimeType = file.mimetype;
      return `data:${mimeType};base64,${base64}`;
    };

    // Parse languages field nếu nó là JSON string
    let languagesValue = data.languages;
    if (languagesValue && typeof languagesValue === 'string') {
      try {
        languagesValue = JSON.stringify(JSON.parse(languagesValue));
      } catch (e) {
        // Giữ nguyên nếu không phải JSON
      }
    }

    const updateData = stripEmptyFields({
      licenseNumber: data.licenseNumber,
      vehiclePlate: data.vehiclePlate,
      vehicleModel: data.vehicleModel,
      vehicleYear: data.vehicleYear,
      vehicleColor: data.vehicleColor,
      vehiclePhotoUrl: data.vehiclePhotoUrl || fileToBase64(req.files?.vehiclePhoto?.[0]),
      identificationNumber: data.identificationNumber,
      idCardFrontUrl: data.idCardFrontUrl || fileToBase64(req.files?.idCardFront?.[0]),
      idCardBackUrl: data.idCardBackUrl || fileToBase64(req.files?.idCardBack?.[0]),
      licensePhotoUrl: data.licensePhotoUrl || fileToBase64(req.files?.licensePhoto?.[0]),
      languageCertificationUrl: data.languageCertificationUrl || fileToBase64(req.files?.languageCertification?.[0]),
      languages: languagesValue,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountHolderName: data.accountHolderName
    });

    // Chỉ thêm isOnline nếu nó được gửi và có giá trị
    if (data.isOnline !== undefined && data.isOnline !== null) {
      updateData.isOnline = data.isOnline === 'true' || data.isOnline === true;
    }

    const driverProfile = await prisma.driverProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData
      }
    });

    if (userDataToUpdate) {
      // SỬA LỖI 1: Thay đổi 'name' thành 'fullName' để khớp hoàn chỉnh dữ liệu Prisma Schema
      await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: userDataToUpdate.fullName || userDataToUpdate.name, 
          email: userDataToUpdate.email,
          phone: userDataToUpdate.phone,
          address: userDataToUpdate.address,                     // THÊM: Lưu địa chỉ vào DB
          city: userDataToUpdate.city,                           // THÊM: Lưu thành phố vào DB
          country: userDataToUpdate.country,
          avatarUrl: userDataToUpdate.avatarUrl
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
    console.error("Error updating driver profile:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
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

// Get ratings received by the authenticated driver.
// Returns recent ratings together with the rider name so the driver can read feedback.
app.get("/driver/ratings", authRequired, async (req, res) => {
  try {
    const userId = Number(req.auth.sub);
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found." });
    }

    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const ratings = await prisma.rating.findMany({
      where: { ride: { driverProfileId: driverProfile.id } },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return res.json({
      averageRating: driverProfile.averageRating,
      total: ratings.length,
      ratings: ratings.map((r) => {
        let compliments = [];
        if (r.complimentsJson) {
          try {
            const parsed = JSON.parse(r.complimentsJson);
            if (Array.isArray(parsed)) compliments = parsed;
          } catch {
            /* ignore */
          }
        }
        return {
          id: r.id,
          rideId: r.rideId,
          score: r.score,
          comment: r.comment,
          compliments,
          createdAt: r.createdAt,
          riderName: r.user?.fullName || null,
          riderAvatar: r.user?.avatarUrl || null
        };
      })
    });
  } catch (error) {
    console.error("Error fetching driver ratings:", error);
    return res.status(500).json({ message: "Internal server error" });
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
        ride: null,
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
    let booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        vehicleClass: true,
        ride: {
          include: {
            driver: { include: { user: true } },
            rating: true,
            payment: true
          }
        }
      }
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const userId = Number(req.auth.sub);
    if (booking.userId !== userId) {
      const driverProfile = await prisma.driverProfile.findUnique({ where: { userId } });
      const isAssignedDriver =
        driverProfile &&
        booking.ride &&
        booking.ride.driverProfileId === driverProfile.id;
      if (!isAssignedDriver) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
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

    // Allow accepting either instant REQUESTED bookings or SCHEDULED bookings
    if (!["REQUESTED", "SCHEDULED"].includes(booking.status)) {
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

app.post("/driver/complete-ride/:bookingId", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const bookingId = Number(req.params.bookingId);
  try {
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found." });
    }

    // Load booking and its user so we can snapshot customer profile
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { user: true } });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const customerSnapshot = booking.user
      ? {
          id: booking.user.id,
          fullName: booking.user.fullName,
          email: booking.user.email,
          phone: booking.user.phone,
          avatarUrl: booking.user.avatarUrl
        }
      : null;

    const ride = await prisma.ride.findFirst({
      where: { bookingId, driverProfileId: driverProfile.id }
    });
    if (!ride) {
      return res.status(404).json({ message: "Ride not found for this driver." });
    }

    const now = new Date();
    const finalFare = booking.estimatedFare ?? ride.finalFare ?? 0;

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        customerSnapshotJson: customerSnapshot ? JSON.stringify(customerSnapshot) : undefined
      }
    });

    if (ride.status !== "COMPLETED") {
      await prisma.ride.update({
        where: { id: ride.id },
        data: {
          status: "COMPLETED",
          endTime: now,
          finalFare
        }
      });
    }

    const fullBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        vehicleClass: true,
        ride: {
          include: {
            driver: { include: { user: true } },
            payment: true
          }
        }
      }
    });

    res.json({ message: "Ride completed successfully.", booking: fullBooking });
  } catch (error) {
    console.error("Error completing ride:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/bookings/:bookingId/payment-method", authRequired, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const method = normalizePaymentMethod(req.body?.method);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "Invalid booking id" });
  }
  if (!method) {
    return res.status(400).json({ message: "Payment method must be MOMO, CASH, or CARD" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId }
  });
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }
  if (booking.userId !== Number(req.auth.sub)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentMethod: method,
      paymentMethodLabel: paymentMethodLabel(method, req.body?.label)
    }
  });

  return res.json({ booking: updatedBooking });
});

app.post("/bookings/:bookingId/confirm-payment", authRequired, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ride: true }
  });
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }
  if (booking.userId !== Number(req.auth.sub)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const method = normalizePaymentMethod(req.body?.method || booking.paymentMethod) || "CASH";
  const label = paymentMethodLabel(method, req.body?.label || booking.paymentMethodLabel);
  const requestedAmount = Number(req.body?.amount ?? booking.estimatedFare ?? 0);
  const amount = Number.isFinite(requestedAmount) && requestedAmount >= 0 ? requestedAmount : 0;
  const ride = await ensureRideForBooking(booking);

  const payment = await prisma.payment.upsert({
    where: { rideId: ride.id },
    create: {
      rideId: ride.id,
      method,
      provider: method,
      amount,
      currency: "VND",
      status: "PAID",
      externalId: method === "MOMO" ? `MOCK_MOMO_${Date.now()}` : null,
      paidAt: new Date()
    },
    update: {
      method,
      provider: method,
      amount,
      currency: "VND",
      status: "PAID",
      externalId: method === "MOMO" ? `MOCK_MOMO_${Date.now()}` : null,
      failureReason: null,
      paidAt: new Date()
    }
  });

  const [updatedBooking, updatedRide] = await Promise.all([
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentMethod: method,
        paymentMethodLabel: label,
        status: "COMPLETED"
      }
    }),
    prisma.ride.update({
      where: { id: ride.id },
      data: {
        status: "COMPLETED",
        endTime: ride.endTime || new Date(),
        finalFare: amount
      }
    })
  ]);

  return res.json({
    booking: updatedBooking,
    ride: updatedRide,
    payment
  });
});

app.patch("/bookings/:bookingId/preferences", authRequired, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }
  if (booking.userId !== Number(req.auth.sub)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (["CANCELLED", "COMPLETED"].includes(booking.status)) {
    return res.status(400).json({ message: "Cannot update preferences for this booking" });
  }

  const prefs = req.body?.preferences ?? req.body;
  const preferencesJson = JSON.stringify({
    languages: Array.isArray(prefs?.languages) ? prefs.languages : [],
    ridePreferences: Array.isArray(prefs?.ridePreferences) ? prefs.ridePreferences : [],
    specialRequest: typeof prefs?.specialRequest === "string" ? prefs.specialRequest : ""
  });

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { preferencesJson }
  });

  return res.json({ booking: updated });
});

app.post("/bookings/:bookingId/cancel", authRequired, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ride: true }
  });
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }
  if (booking.userId !== Number(req.auth.sub)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (["CANCELLED", "COMPLETED"].includes(booking.status)) {
    return res.status(400).json({ message: "Booking already finished or cancelled" });
  }
  if (booking.ride && ["IN_PROGRESS", "COMPLETED", "DRIVER_EN_ROUTE", "ARRIVED"].includes(booking.ride.status)) {
    return res.status(400).json({ message: "Ride already started; cannot cancel" });
  }

  if (booking.ride) {
    await prisma.ride.delete({ where: { id: booking.ride.id } });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date() }
  });

  return res.json({ booking: updated });
});

// User's current in-progress instant booking (waiting or active ride)
app.get("/bookings/my-active", authRequired, async (req, res) => {
  try {
    const userId = Number(req.auth.sub);
    const booking = await prisma.booking.findFirst({
      where: {
        userId,
        bookingType: "INSTANT",
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        OR: [
          { status: "REQUESTED" },
          { status: "ACCEPTED" },
          {
            ride: {
              status: { in: ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"] }
            }
          }
        ]
      },
      include: {
        vehicleClass: true,
        ride: { include: { driver: { include: { user: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!booking) {
      return res.json({ booking: null });
    }

    return res.json({
      booking: {
        id: booking.id,
        status: booking.status,
        pickupAddress: booking.pickupAddress,
        destination: booking.destination,
        bookingType: booking.bookingType,
        hasDriver: Boolean(booking.ride),
        rideStatus: booking.ride?.status || null,
        driverName: booking.ride?.driver?.user?.fullName || null,
        vehicleModel: booking.ride?.driver?.vehicleModel || null,
        vehiclePlate: booking.ride?.driver?.vehiclePlate || null
      }
    });
  } catch (error) {
    console.error("Error fetching active booking:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

io.on("connection", (socket) => {
  socket.on("join_ride", async (payload = {}, acknowledge) => {
    const rideId = Number(payload.rideId);
    if (!Number.isInteger(rideId) || rideId <= 0) {
      acknowledge?.({ ok: false, message: "Invalid ride id" });
      return;
    }

    socket.join(`ride_${rideId}`);
    acknowledge?.({ ok: true });
  });

  socket.on("send_message", async (payload = {}, acknowledge) => {
    const rideId = Number(payload.rideId);
    const senderUserId = Number(payload.senderUserId);
    const senderRole = String(payload.senderRole || "").toUpperCase();
    const body = String(payload.body || "").trim();

    if (!Number.isInteger(rideId) || rideId <= 0) {
      acknowledge?.({ ok: false, message: "Invalid ride id" });
      return;
    }
    if (!Number.isInteger(senderUserId) || senderUserId <= 0) {
      acknowledge?.({ ok: false, message: "Invalid sender" });
      return;
    }
    if (!["USER", "DRIVER"].includes(senderRole)) {
      acknowledge?.({ ok: false, message: "Invalid sender role" });
      return;
    }
    if (!body) {
      acknowledge?.({ ok: false, message: "Message cannot be empty" });
      return;
    }

    try {
      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      if (!ride) {
        acknowledge?.({ ok: false, message: "Ride not found" });
        return;
      }

      let translatedBody = null;
      try {
        translatedBody = await translateViJa(body);
      } catch (error) {
        console.error(error);
      }

      const message = await prisma.message.create({
        data: {
          rideId,
          senderUserId,
          senderRole,
          body,
          translatedBody
        }
      });
      const formatted = formatMessage(message);
      io.to(`ride_${rideId}`).emit("new_message", formatted);
      acknowledge?.({ ok: true, message: formatted });
    } catch (error) {
      console.error(error);
      acknowledge?.({ ok: false, message: "Could not send message" });
    }
  });

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

async function startServer() {
  await ensureDefaultVehicleClasses();
  server.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
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
        pickupLat: b.pickupLat,
        pickupLng: b.pickupLng,
        destinationLat: b.destinationLat,
        destinationLng: b.destinationLng,
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
        status: { in: ["SCHEDULED", "ACCEPTED"] },
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
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      const timeStr = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;
      const vehicleType = b.vehicleClass?.name?.toLowerCase() || "economy";
      const driverAssigned = Boolean(b.ride);
      const canCancel =
        !b.ride || (b.ride.status === "ACCEPTED" && !canStartScheduledRide(b.scheduledAt));

      return {
        id: b.id,
        from: b.pickupAddress,
        to: b.destination,
        date: dateStr,
        time: timeStr,
        scheduledAt: b.scheduledAt,
        vehicle: vehicleType,
        bookingStatus: b.status,
        rideStatus: b.ride?.status || null,
        driverName: b.ride?.driver?.user?.fullName || null,
        driverAssigned,
        canCancel
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching upcoming rides:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Cancel a user's reservation/booking and notify the driver's reservation list.
app.post("/bookings/:bookingId/cancel", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const bookingId = Number(req.params.bookingId);

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ride: true }
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.status === "COMPLETED") {
      return res.status(400).json({ message: "Completed bookings cannot be cancelled" });
    }

    const cancelledAt = new Date();
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt
      }
    });

    if (booking.ride) {
      await prisma.ride.update({
        where: { id: booking.ride.id },
        data: {
          status: "CANCELLED",
          cancelledAt,
          cancelReason: "USER_CANCELLED"
        }
      });
    }

    return res.json({ message: "Booking cancelled.", booking: updatedBooking });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return res.status(500).json({ message: "Internal server error" });
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
        status: { in: ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "IN_PROGRESS", "CANCELLED"] }
      },
      include: {
        booking: { include: { user: true, vehicleClass: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const mapped = rides.map((r) => {
      const b = r.booking;
      const when = b.scheduledAt || b.createdAt;
      let dateStr = "";
      let timeStr = "";
      if (when) {
        const d = new Date(when);
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }

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

      const pref = parsePreferencesJson(b.preferencesJson);

      return {
        id: String(b.id),
        rideId: r.id,
        date: dateStr,
        time: timeStr,
        scheduledAt: when,
        bookingStatus: b.status,
        rideStatus: r.status,
        customerName: b.user?.fullName || "",
        customerAvatar: b.user?.avatarUrl || null,
        customerRating: b.user?.averageRating || 0,
        pickup: b.pickupAddress,
        destination: b.destination,
        distance: b.routeDistanceMeters ? `${Math.round(b.routeDistanceMeters / 1000)} km` : "",
        duration: b.routeDurationSeconds ? String(Math.round(b.routeDurationSeconds / 60)) : "",
        earnings: b.estimatedFare ? String(Math.round(b.estimatedFare)) : "",
        languages: langs.length ? langs : pref.languages,
        preferences: prefs.length ? prefs : pref.ridePreferences,
        specialRequest: pref.specialRequest || null,
        bookingType: b.bookingType,
        bookingStatus: b.status,
        rideStatus: r.status,
        scheduledAt: b.scheduledAt,
        canStart: canStartScheduledRide(b.scheduledAt)
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching accepted rides:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Driver cancels their acceptance for a booking (unassign driver, remove ride)
app.post("/driver/cancel-acceptance/:bookingId", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const bookingId = Number(req.params.bookingId);
  try {
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) return res.status(404).json({ message: 'Driver profile not found.' });

    const ride = await prisma.ride.findFirst({ where: { bookingId, driverProfileId: driverProfile.id } });
    if (!ride) return res.status(404).json({ message: 'No accepted ride found for this driver.' });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    const nextStatus = booking?.bookingType === "SCHEDULED" ? "SCHEDULED" : "REQUESTED";

    await prisma.ride.delete({ where: { id: ride.id } });
    await prisma.booking.update({ where: { id: bookingId }, data: { status: nextStatus } });

    return res.json({ message: "Acceptance cancelled." });
  } catch (error) {
    console.error('Error cancelling acceptance:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/driver/start-scheduled-ride/:bookingId", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const bookingId = Number(req.params.bookingId);

  try {
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found." });
    }

    const ride = await prisma.ride.findFirst({
      where: { bookingId, driverProfileId: driverProfile.id },
      include: { booking: true }
    });
    if (!ride) {
      return res.status(404).json({ message: "No accepted ride found for this driver." });
    }
    if (ride.booking.bookingType !== "SCHEDULED") {
      return res.status(400).json({ message: "Not a scheduled reservation." });
    }
    if (!canStartScheduledRide(ride.booking.scheduledAt)) {
      return res.status(400).json({
        message: "Too early to start. You can start within 30 minutes of the scheduled pickup time."
      });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: ride.id },
      data: {
        status: "DRIVER_EN_ROUTE",
        startedAt: ride.startedAt || new Date()
      }
    });

    return res.json({ message: "Ride started.", ride: updatedRide, booking: ride.booking });
  } catch (error) {
    console.error("Error starting scheduled ride:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Submit rating for a ride (by the rider). Accepts { score, comment, compliments?, tipAmount? }
app.post("/rides/:rideId/rating", authRequired, async (req, res) => {
  const userId = Number(req.auth.sub);
  const rideId = Number(req.params.rideId);
  const { score, comment, compliments, tipAmount } = req.body || {};

  if (!score || Number(score) < 1 || Number(score) > 5) {
    return res.status(400).json({ message: "score must be an integer between 1 and 5" });
  }

  try {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (ride.riderId !== userId) {
      return res.status(403).json({ message: "Only the rider can submit a rating for this ride" });
    }

    // Create rating (one-per-ride constraint enforced by schema)
    const complimentsJson =
      Array.isArray(compliments) && compliments.length
        ? JSON.stringify(compliments.filter((c) => typeof c === "string" && c.trim()))
        : null;

    const rating = await prisma.rating.create({
      data: {
        rideId,
        userId,
        score: Number(score),
        comment: comment || null,
        compliments: complimentsJson
      }
    });

    // Handle tip if provided: add to ride.finalFare and to payment if exists or create a payment record
    const tip = tipAmount ? Number(tipAmount) : 0;
    if (tip && !Number.isNaN(tip) && tip > 0) {
      const currentFinal = ride.finalFare || 0;
      await prisma.ride.update({ where: { id: rideId }, data: { finalFare: currentFinal + tip } });

      // Update or create payment
      const existingPayment = await prisma.payment.findUnique({ where: { rideId } }).catch(() => null);
      if (existingPayment) {
        await prisma.payment.update({ where: { id: existingPayment.id }, data: { amount: existingPayment.amount + tip } });
      } else {
        await prisma.payment.create({
          data: {
            rideId,
            method: "TIP",
            amount: tip,
            status: "PAID",
            paidAt: new Date()
          }
        });
      }
    }

    // Recompute driver average rating if driver assigned
    if (ride.driverProfileId) {
      const allRatings = await prisma.rating.findMany({ where: { ride: { driverProfileId: ride.driverProfileId } } });
      const avg = allRatings.length ? allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length : null;
      await prisma.driverProfile.update({ where: { id: ride.driverProfileId }, data: { averageRating: avg } });
    }

    return res.json({ rating });
  } catch (error) {
    console.error("Error submitting rating:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});