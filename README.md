# Taxi Booking Web App

Taxi Booking Web App is a full-stack ride booking platform with a Vite frontend, Express backend, Prisma data layer, JWT auth, location autocomplete, pricing, booking flow, and route preview.

## What is included

- Prisma schema and ERD in `docs/ERD.md`.
- Database migrations and seed script in `backend/prisma`.
- CRUD API for `users`, `driverProfiles`, `vehicleClasses`, `bookings`, `rides`, `payments`, and `ratings`.
- Auth flow with signup/login, JWT issuance, and protected endpoints using `Authorization: Bearer <token>`.
- Booking flow with validation, location suggestions, route preview, and pricing estimation.
- Location autocomplete powered by Photon with Nominatim fallback.
- Map rendering with Leaflet + OpenStreetMap and route geometry preview through OSRM.

## Environment

Frontend:

- `VITE_API_BASE_URL` (preferred)
- `VITE_API_URL` (compatible alias)

Backend:

- `DATABASE_URL`
- `PORT`
- `JWT_SECRET`
- `PHOTON_BASE_URL`
- `NOMINATIM_BASE_URL`
- `NOMINATIM_USER_AGENT`
- `OSRM_BASE_URL`
- `HANOI_BBOX` in `minLon,minLat,maxLon,maxLat` format
- `GOOGLE_TRANSLATE_API_KEY` if translation is enabled in your deployment

## Run locally

### Frontend only

```bash
npm install
cp .env.example .env
npm run dev
```

### Full stack development

```bash
npm install
cp .env.example .env

cd backend
npm install
cp .env.example .env
npm run prisma:migrate -- --name init
npm run seed
cd ..

npm run dev:all
```

Frontend runs at `http://localhost:5173`.

Backend runs at `http://localhost:4000`.

## Production deploy

Use this flow when preparing a release:

```bash
npm install
npm run build

cd backend
npm install
npm run prisma:deploy
npm run start
```

Before deploy, update the frontend `.env` so `VITE_API_BASE_URL` points to the deployed backend URL.

For Vercel deployments, add `VITE_API_BASE_URL` (or `VITE_API_URL`) in Project Settings -> Environment Variables (for Preview and Production), then redeploy.

Example:

```bash
VITE_API_BASE_URL=https://your-backend-domain.com
```

Only run `npm run seed` when you need to populate fresh data.

## Main API

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `GET /locations/suggest?q=...`
- `POST /routes/preview`
- `POST /pricing/estimate`
- `POST /bookings/create-flow`
- CRUD endpoints for each core table:
  - `GET/POST /crud/users`
  - `GET/PUT/DELETE /crud/users/:id`
  - same pattern for `driverProfiles`, `vehicleClasses`, `bookings`, `rides`, `payments`, and `ratings`

## Notes

- `npm run dev:all` starts both frontend and backend concurrently from the root workspace.
- The backend uses Prisma migrations, so prefer `prisma:deploy` in production and `prisma:migrate` only for local development.
