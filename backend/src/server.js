import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

app.use(cors());
app.use(express.json());

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

// Member 2: POST /bookings/reserve, /payments/*
// Member 3: /driver/*
// Member 4: /rides/:rideId/messages + WebSocket

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

  const ride = await ensureDemoRide(rideId);
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
      const ride = await ensureDemoRide(rideId);
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

server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
