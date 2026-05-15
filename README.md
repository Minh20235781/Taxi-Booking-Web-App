
# Taxi Booking Web App

Frontend keeps the original UI from the design prototype, and Sprint 1 adds backend/database/auth/booking/map foundations.

## Sprint 1 delivered

- Database design with Prisma schema and ERD: `docs/ERD.md`.
- Database migrations and seed scripts in `backend/prisma`.
- CRUD API for all core tables (`users`, `driverProfiles`, `vehicleClasses`, `bookings`, `rides`, `payments`, `ratings`).
- Login/Signup integrated with backend validations.
- Login/Signup now return JWT token and protected APIs require `Authorization: Bearer <token>`.
- Booking flow supports required field validation, max 5 location suggestions, and carry data to next page.
- Location autocomplete uses Photon (primary) with Nominatim fallback, and returns `placeId + label + lat + lon`.
- Map component uses Leaflet + OpenStreetMap and renders real route geometry from OSRM preview API.

## Run locally

### 1) Frontend

```bash
npm install
cp .env.example .env
npm run dev
```

### 2) Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```

Backend runs at `http://localhost:4000`.

Backend `.env` also supports:

- `PHOTON_BASE_URL`
- `NOMINATIM_BASE_URL`
- `NOMINATIM_USER_AGENT`
- `OSRM_BASE_URL`
- `HANOI_BBOX` (format: `minLon,minLat,maxLon,maxLat`)

## Main API

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `GET /locations/suggest?q=...`
- `POST /routes/preview`
- `POST /pricing/estimate` — fare from `VehicleClass` + distance/duration (or from/to coords)
- `POST /bookings/create-flow` — full booking payload (coords, route, fare, scheduled, preferences); requires JWT
- CRUD for each table:
  - `GET/POST /crud/users`
  - `GET/PUT/DELETE /crud/users/:id`
  - same pattern for `driverProfiles`, `vehicleClasses`, `bookings`, `rides`, `payments`, `ratings`.
  