# Deployment guide

Three pieces: MongoDB Atlas (database) → Render (API) → Vercel (frontend).

## 1. MongoDB Atlas

Already set up if you followed along — a free M0 cluster works fine. Just confirm:
- Network access allows connections from anywhere (`0.0.0.0/0`), since Render's
  outbound IPs aren't static on the free tier.
- You have the full connection string with a real username/password, e.g.
  `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/appointment-booking?retryWrites=true&w=majority`.

## 2. Backend → Render

1. Push this repo to GitHub.
2. In Render: **New +** → **Web Service** → connect the repo.
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables (copy from `server/.env.example`, using real values):
   - `NODE_ENV=production`
   - `MONGO_URI` — your real Atlas connection string
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` — long random strings (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` run twice)
   - `CLIENT_ORIGIN` — your Vercel URL once you have it (e.g. `https://your-app.vercel.app`); update this after step 3
   - `SLOT_HOLD_MINUTES`, `SLOT_GENERATION_WEEKS` — defaults are fine
   - `EMAIL_*` — optional, leave blank to skip real email sending (notifications still get queued, just never delivered)
7. Deploy. Confirm `https://<your-service>.onrender.com/api/health` returns `{"status":"ok"}`.
8. Run the admin seed script once, from your local machine, pointed at the
   production database: `cd server && MONGO_URI="<atlas uri>" node src/scripts/createAdmin.js "Your Name" you@example.com <password>`

Note: Render's free tier spins down on inactivity; the first request after
idle can take ~30s to wake up. The in-process cron jobs (slot generation,
hold cleanup, notification sending) only run while the service is awake —
fine for a demo, but for real usage upgrade to an always-on plan or move
those jobs to Render's separate Cron Job feature.

## 3. Frontend → Vercel

1. In Vercel: **Add New** → **Project** → import the same repo.
2. Root directory: `client`
3. Framework preset: Vite (auto-detected).
4. Environment variable: `VITE_API_URL=https://<your-render-service>.onrender.com/api`
5. Deploy.
6. Go back to Render and update `CLIENT_ORIGIN` to your Vercel URL, then redeploy
   the backend so CORS and the refresh-token cookie's `sameSite`/`secure`
   settings line up with the real frontend origin.

## 4. Smoke test

- Visit the Vercel URL, register a provider, add a service and availability
  rule, and confirm `/api/health` on the Render URL responds.
- Slots won't appear until the nightly generation job runs (2am server time)
  or you trigger it manually once via a Render shell / one-off job:
  `node -e "require('./src/config/db').connectDB().then(async()=>{await require('./src/jobs/generateSlots').generateSlotsForAllProviders();process.exit(0)})"`
- Register a customer, book a slot, cancel it, and confirm the admin account
  (from the seed script) can see it in the analytics/audit log.

## 5. CI

`.github/workflows/ci.yml` runs the server test suite (including the
concurrency test, via an ephemeral in-memory MongoDB replica set) and builds
the client on every push/PR to `main`. No secrets are needed for CI since
tests use `mongodb-memory-server`, not a real database.
