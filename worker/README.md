# VoiceBook WhatsApp worker

A persistent Node service (Baileys) that drains the Convex `outbox` and sends
each message over WhatsApp. It stores its WhatsApp login in Convex (`waSession`)
so it survives redeploys without re-scanning.

## Why a separate service
Baileys holds a live WhatsApp socket + auth session, so it can't run on Vercel
serverless or Convex. It runs on Railway (always-on). The frontend never calls
it directly — it only inserts rows into the Convex `outbox`, which this worker
polls.

## Run locally
```bash
cd worker
npm install
CONVEX_URL="https://<your-deployment>.convex.cloud" npm start
```
On first run it prints a QR in the terminal — open WhatsApp → **Linked devices →
Link a device** and scan it. After that the session is saved in Convex.

## Deploy to Railway
```bash
cd worker
railway init          # create/select a project
railway variables set CONVEX_URL="https://<your-deployment>.convex.cloud"
railway up            # deploy
railway logs          # one-time: scan the printed QR to link WhatsApp
```
`npm start` (`node index.js`) is the start command; Railway's Nixpacks
auto-detects Node.

## Env
- `CONVEX_URL` (required) — your Convex deployment URL (same as the app's `VITE_CONVEX_URL`).
- `POLL_MS` (optional) — outbox poll interval in ms (default 2500).

## Note
Baileys is an unofficial WhatsApp library. Use a spare/Business number, keep
volume low, and only message people who expect it — bulk/cold sending risks a
number ban.
