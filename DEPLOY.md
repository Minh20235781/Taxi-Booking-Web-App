# Deploy guide (Vercel + Render + Supabase)

Stack:

| Layer | Service | Why |
|-------|---------|-----|
| Frontend | **Vercel** | Vite SPA |
| Backend + Socket.IO | **Render** (or Railway) | Node process + WebSocket |
| Database | **Supabase PostgreSQL** | Shared DB for all users |

---

## 1. Supabase — database

1. Create project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI** (port **5432**, not pooler).
3. Copy URL, replace `[YOUR-PASSWORD]`.

Example:

```env
DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

For `prisma migrate deploy`, prefer the **direct** connection (host `db.xxxx.supabase.co:5432`) if the pooler fails migrations.

---

## 2. Render — backend API

1. Push code to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New → Blueprint** (uses `render.yaml`)  
   **or** **New Web Service** → connect repo:
   - **Root directory:** `backend`
   - **Build command:** `npm install && npm run prisma:generate`
   - **Start command:** `npm run start:prod`
   - **Health check path:** `/health`
3. Environment variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase URI (port 5432) |
| `JWT_SECRET` | Random string ≥ 32 chars |
| `FRONTEND_URL` | `https://your-app.vercel.app` (add `,http://localhost:5173` for local dev) |
| `NODE_VERSION` | `20` |

4. After first deploy succeeds, open **Render Shell** (or run locally with production `DATABASE_URL`):

```bash
cd backend
npm run seed
```

Demo accounts after seed:

- User: `user@example.com` / `Password@123`
- Driver: `driver@example.com` / `Password@123` (online by default)

5. Verify: `https://YOUR-RENDER-URL.onrender.com/health` → `{"ok":true,...}`

---

## 3. Vercel — frontend

1. [vercel.com](https://vercel.com) → **Import** GitHub repo.
2. Framework: **Vite** (auto-detected).
3. **Environment variable** (required before build):

```env
VITE_API_BASE_URL=https://YOUR-RENDER-URL.onrender.com
```

4. Deploy. `vercel.json` already rewrites all routes to `index.html` for React Router.

5. Copy Vercel URL → update Render `FRONTEND_URL` → redeploy backend (CORS).

---

## 4. Local dev (same Postgres as production or separate Supabase project)

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, FRONTEND_URL=http://localhost:5173
npm install
npm run prisma:deploy
npm run seed
npm run dev

# Terminal 2 — frontend
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:4000
npm install
npm run dev
```

Or one command from repo root:

```bash
npm run dev:all
```

---

## 5. Smoke test after deploy

1. Open Vercel URL on two devices/browsers.
2. Login driver → **toggle Online ON** on `/driver/home`.
3. Login user → book instant ride → confirm.
4. Driver should see green popup within ~5s → Accept.
5. User ride page should show driver info.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| API calls go to `localhost:4000` | Rebuild Vercel with `VITE_API_BASE_URL` set |
| CORS error | Add exact Vercel URL to Render `FRONTEND_URL` |
| Driver never sees ride | Driver must be **Online**; languages must match user prefs |
| Chat not working | Backend must be Render/Railway (not Vercel serverless) |
| `prisma migrate deploy` fails on Supabase | Use direct DB URL (port 5432, host `db.*.supabase.co`) |

---

## Files added for deploy

- `vercel.json` — SPA routing
- `render.yaml` — Render blueprint
- `backend/prisma/migrations/20260527120000_postgres_init/` — PostgreSQL schema
- `backend/.env.example` / `.env.example` — env templates

**Note:** SQLite local `dev.db` is no longer used. All environments use PostgreSQL.
