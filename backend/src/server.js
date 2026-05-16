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
