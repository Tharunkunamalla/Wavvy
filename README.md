<div align="center">

# 🎬 Wavvy

**Watch videos together, in perfect sync — no matter where you are.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📖 What is Wavvy?

Wavvy is a **real-time watch party platform** that lets friends, families, and fandoms watch YouTube videos together in perfect synchronization. Create a room, share the link, and enjoy — no downloads, no plugins, just paste a link and watch.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔄 **Synchronized Playback** | Play, pause, and seek are synced in real time for every member in the room |
| 🏠 **Room System** | Create named rooms or join existing ones by ID |
| 💬 **Live Chat** | Real-time group chat with full message history, persisted in the database |
| 📋 **Playlist Queue** | Add YouTube/Dropbox links to a shared queue; auto-play the next item when the current one ends |
| 👑 **Host Controls** | The room creator is the host and can grant or revoke playback control to any member |
| 🎥 **Video Calls** | WebRTC peer-to-peer video calling directly inside the room |
| 🚫 **Kick Users** | Hosts can remove disruptive members from the room |
| 🔑 **Mod Requests** | Members can request moderation privileges from the host |
| 💡 **No Account Required** | Login is just a name + email stored locally — no passwords, no sign-up friction |
| 🆓 **Free Forever** | No paywalls, no subscriptions |

---

## 🏗️ Project Structure

```
Wavvy/
├── client/                  # React + Vite frontend
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI components (e.g. FAQItem)
│   │   ├── lib/
│   │   │   └── env.js       # Environment variable helpers (BACKEND_URL, API_BASE_URL)
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Home — create or join a room
│   │   │   ├── LoginPage.jsx     # Simple name + email login
│   │   │   ├── RoomPage.jsx      # The main watch party experience
│   │   │   ├── AboutUs.jsx       # About page
│   │   │   └── ContactUs.jsx     # Contact page
│   │   ├── App.jsx          # Router + route protection
│   │   └── main.jsx         # React entry point
│   ├── vite.config.js
│   └── package.json
│
├── server/                  # Node.js + Express backend
│   ├── models/
│   │   └── Room.js          # Mongoose schema for rooms
│   ├── index.js             # Express app, Socket.IO events, API routes
│   ├── .env.example         # Environment variable template
│   └── package.json
│
├── vercel.json              # Vercel deployment config (frontend)
└── package.json             # Root-level dependency (react-player)
```

---

## 🛠️ Tech Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| Vite | 5 | Build tool & dev server |
| Tailwind CSS | 4 | Utility-first styling |
| React Router | 7 | Client-side routing |
| Socket.IO Client | 4 | Real-time communication |
| ReactPlayer | 2 | YouTube / video playback |
| Axios | 1 | HTTP requests |
| Lucide React | latest | Icons |
| React Hot Toast | 2 | Toast notifications |

### Backend
| Library | Version | Purpose |
|---|---|---|
| Express | 5 | HTTP server & REST API |
| Socket.IO | 4 | WebSocket server |
| Mongoose | 9 | MongoDB ODM |
| dotenv | 17 | Environment variable loading |
| cors | 2 | Cross-origin request handling |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A **MongoDB** instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone the repository

```bash
git clone https://github.com/Tharunkunamalla/Wavvy.git
cd Wavvy
```

### 2. Set up the backend

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` with your values:

```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/wavvy
CLIENT_URL=http://localhost:5173
```

Start the backend in development mode:

```bash
npm run dev
```

The server starts at `http://localhost:5001`.

### 3. Set up the frontend

Open a second terminal:

```bash
cd client
npm install
```

Optionally create `client/.env.local` to override the backend URL:

```env
VITE_BACKEND_URL=http://localhost:5001
```

> If this variable is not set, the frontend defaults to `http://localhost:5001` in development and the same origin in production.

Start the frontend dev server:

```bash
npm run dev
```

The app opens at `http://localhost:5173`.

---

## ⚙️ Environment Variables

### Backend (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Port the server listens on |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `CLIENT_URL` | No | — | Allowed CORS origin (informational) |

### Frontend (`client/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_BACKEND_URL` | No | Same origin in prod, `http://localhost:5001` in dev | Base URL of the backend |

---

## 🔌 API Reference

### REST

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/check-room?roomId=<id>` | Check whether a room with the given ID exists |

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId, user: { name, email } }` | Join (or create) a room |
| `video-state-change` | `{ roomId, state: "playing"\|"paused", time }` | Broadcast a play/pause/seek (host/mod only) |
| `video-load` | `{ roomId, url }` | Load a new video for everyone (host/mod only) |
| `send-message` | `{ roomId, message, sender }` | Send a chat message |
| `clear-chat` | `{ roomId }` | Clear the chat history |
| `add-to-playlist` | `{ roomId, url }` | Add a URL to the shared playlist queue |
| `remove-from-playlist` | `{ roomId, index }` | Remove an item from the playlist (host/mod only) |
| `skip-to-next` | `{ roomId }` | Skip to the next item in the queue (host/mod only) |
| `set-playlist` | `{ roomId, playlist }` | Replace the entire playlist (host/mod only) |
| `toggle-auto-play` | `{ roomId, autoPlayNext }` | Enable/disable auto-play (host/mod only) |
| `toggle-permission` | `{ roomId, targetId, canControl }` | Grant/revoke control to a member (host only) |
| `kick-user` | `{ roomId, targetId }` | Remove a user from the room (host only) |
| `request-mod` | `{ roomId, userName }` | Ask the host for moderation rights |
| `join-video-call` | `{ roomId }` | Join the in-room video call |
| `video-offer` | `{ target, caller, sdp }` | WebRTC offer for P2P video |
| `video-answer` | `{ target, caller, sdp }` | WebRTC answer for P2P video |
| `video-ice-candidate` | `{ target, candidate, caller }` | ICE candidate exchange |
| `invite-to-video-call` | `{ targetId, callerName }` | Send a call invite to a member |
| `video-invite-response` | `{ targetId, accepted, userName }` | Accept/decline a call invite |
| `leave-video-call` | `{ roomId }` | Leave the in-room video call |

#### Server → Client

| Event | Payload | Description |
|---|---|---|
| `sync-video` | `{ state, time }` | Playback state update |
| `sync-video-load` | `{ url }` | Load a new video |
| `sync-playlist` | `playlist[]` | Updated playlist |
| `sync-auto-play` | `boolean` | Auto-play toggle state |
| `update-members` | `members[]` | Updated member list with roles |
| `receive-message` | `{ message, sender, timestamp }` | Incoming chat message |
| `chat-history` | `messages[]` | Full chat history on join / after clear |
| `kicked` | — | You have been removed from the room |
| `mod-request` | `{ userId, userName }` | Incoming mod request (to host) |
| `user-joined-video` | `{ userId, userName }` | Someone joined the video call |
| `user-left-video` | `{ userId }` | Someone left the video call |
| `video-offer` | `{ caller, sdp }` | Incoming WebRTC offer |
| `video-answer` | `{ caller, sdp }` | Incoming WebRTC answer |
| `video-ice-candidate` | `{ candidate, caller }` | ICE candidate for P2P setup |
| `incoming-video-call` | `{ callerName }` | Incoming call notification |
| `video-invite-response` | `{ accepted, userName }` | Response to your call invite |

---

## 🗄️ Database Schema

**Room** (`models/Room.js`)

| Field | Type | Description |
|---|---|---|
| `roomId` | String (unique) | Short random identifier for the room |
| `hostId` | String | Socket ID of the current host connection |
| `creatorEmail` | String | Email of the original room creator (used to re-identify the host on reconnect) |
| `videoUrl` | String | Currently loaded video URL |
| `currentTime` | Number | Playback position in seconds |
| `isPlaying` | Boolean | Whether video is currently playing |
| `autoPlayNext` | Boolean | Whether to auto-play the next playlist item |
| `playlist` | Mixed[] | Array of `{ url, addedBy }` objects |
| `members` | Object[] | `{ id, name, email, joinedAt }` — historical member list |
| `messages` | Object[] | `{ message, sender, timestamp }` — chat history |
| `createdAt` | Date | Room creation timestamp |

---

## 🌐 Deployment

### Frontend → Vercel

The `vercel.json` at the repository root configures an automatic Vercel deployment:

```json
{
  "installCommand": "npm install --prefix client",
  "buildCommand":   "npm run build --prefix client",
  "outputDirectory": "client/dist"
}
```

**Required Vercel environment variable:**

```
VITE_BACKEND_URL = https://your-backend.onrender.com
```

Set this in **Vercel → Project → Settings → Environment Variables**.

### Backend → Render / Railway / Fly.io / VPS

The backend is a long-running Node.js process and must be hosted on a service that supports persistent connections (Socket.IO needs WebSockets). Recommended platforms: [Render](https://render.com), [Railway](https://railway.app), [Fly.io](https://fly.io).

**Start command:**
```bash
cd server && npm start
```

Set the environment variables (`PORT`, `MONGODB_URI`) in your hosting provider's dashboard.

---

## 📄 Pages Overview

| Route | Component | Access |
|---|---|---|
| `/` | `LandingPage` | Public |
| `/login` | `LoginPage` | Public |
| `/about` | `AboutUs` | Public |
| `/contact` | `ContactUs` | Public |
| `/room/:roomId` | `RoomPage` | Protected (requires login) |

Login is handled client-side only — the user's `{ name, email }` is stored in `localStorage`. No passwords are stored.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

<div align="center">

© 2026 Wavvy — Watch together, wherever you are. 🧡

</div>
