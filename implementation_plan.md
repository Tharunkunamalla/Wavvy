# Implementation Plan: Wavvy - Watch Together

Wavvy is a real-time watch-party platform built with the MERN stack, Socket.IO for synchronization, and WebRTC for video calls.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Socket.IO Client, WebRTC, Lucide React (Icons).
- **Backend**: Node.js, Express, Socket.IO, MongoDB.
- **Real-time**: Socket.IO for state sync and chat.

## Phase 1: Project Initialization & Setup
- [ ] Create `server` and `client` directories.
- [ ] **Server Setup**:
  - Initialize npm and install: `express`, `socket.io`, `mongoose`, `dotenv`, `cors`, `nodemon`.
  - Create basic folder structure: `routes/`, `models/`, `sockets/`, `controllers/`.
  - Configure basic Express server and MongoDB connection.
- [ ] **Client Setup**:
  - Initialize Vite React project.
  - Setup Tailwind CSS.
  - Install dependencies: `socket.io-client`, `react-router-dom`, `lucide-react`, `axios`, `react-player`.

## Phase 2: Real-time Communication Bridge (Socket.IO)
- [ ] Define WebSocket events:
  - `join-room`, `leave-room`
  - `video-play`, `video-pause`, `video-seek`, `video-load`
  - `send-message`, `receive-message`
- [ ] Implement server-side room management (tracking users in rooms).
- [ ] Implement basic chat broadcasting.

## Phase 3: Core UI & Navigation
- [ ] **Landing Page**: Sleek, modern design with "Create Room" and "Join Room" options.
- [ ] **Room Page Layout**: 
  - Main video area (compatible with YouTube and direct links).
  - Sidebar for Chat and Member list.
  - Playlist section.
  - Control bar for sync status and video calls.
- [ ] **Navigation**: Implement `react-router-dom` for `/room/:id` routes.

## Phase 4: Video Synchronization Logic
- [ ] Use `react-player` for multi-source support.
- [ ] Implement a custom hook for synchronization logic.
- [ ] Host broadcast mechanic: Only host (or authorized users) emits sync events.
- [ ] Time synchronization for late joiners: Server tracks current video timestamp.

## Phase 5: WebRTC Video Calling
- [ ] Setup WebRTC signaling via Socket.IO.
- [ ] Implement "Start Video Call" functionality with peer connections.
- [ ] Support for multiple participants (Mesh or Simple Peer approach).

## Phase 6: Advanced Features & Database Integration
- [ ] MongoDB Schema for:
  - `Rooms`: ID, video state, current video, history.
  - `Users`: Temporary session-based or persisted accounts.
  - `Messages`: Chat history if persistence is needed.
- [ ] Playlist queue management.
- [ ] Host control dashboard: Permissions, ban users, skip videos.

## Phase 7: Polish & Aesthetics
- [ ] Premium glassmorphism UI.
- [ ] Smooth transitions and micro-animations (Framer Motion).
- [ ] SEO optimization and meta tags.
