# Wavvy Client

This frontend is configured to deploy on Vercel.

## How Deploy Works

- Vercel builds the Vite app from `client/`.
- The root `vercel.json` sets output to `client/dist`.
- The app reads backend endpoints from `VITE_BACKEND_URL`.

## Required Environment Variable

Set this in your Vercel project settings:

- `VITE_BACKEND_URL`: public base URL of your backend (example: `https://your-api.onrender.com`)

Without this value, production defaults to the same origin, which only works if your backend is also served at that domain.

## Important Backend Note

This app depends on Socket.IO + WebRTC signaling for room sync and calls.
For stable realtime behavior, host the backend as a long-running Node server (Render, Railway, Fly.io, VPS, etc.) and point `VITE_BACKEND_URL` to it.

## Local Development

Run both apps in separate terminals:

```bash
# backend
cd server
npm install
npm run dev

# frontend
cd client
npm install
npm run dev
```
