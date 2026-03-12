const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('Wavvy Server is running');
});

const Room = require('./models/Room');

// ... (previous imports)

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', async ({ roomId, user }) => {
    socket.join(roomId);
    socket.data.user = user; // Store user info on socket
    
    // Find or create room in DB
    let room = await Room.findOne({ roomId });
    if (!room) {
      room = await Room.create({
        roomId,
        hostId: socket.id,
        members: [{ id: socket.id, name: user.name, email: user.email }]
      });
    } else {
      if (!room.members.find(m => m.id === socket.id)) {
        room.members.push({ id: socket.id, name: user.name, email: user.email });
        await room.save();
      }
    }

    // Send current state to new user
    socket.emit('sync-video-load', { url: room.videoUrl });
    socket.emit('sync-video', { state: room.isPlaying ? 'playing' : 'paused', time: room.currentTime });
    
    // Broadcast updated member list
    const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .map(sid => {
        const s = io.sockets.sockets.get(sid);
        return { id: sid, name: s?.data?.user?.name || 'Guest' };
      });

    io.to(roomId).emit('update-members', roomUsers);
    console.log(`User ${user.name} (${socket.id}) joined room ${roomId}`);
  });

  socket.on('video-state-change', async ({ roomId, state, time }) => {
    socket.to(roomId).emit('sync-video', { state, time });
    
    // Persist state
    await Room.findOneAndUpdate({ roomId }, { 
      isPlaying: state === 'playing',
      currentTime: time 
    });
  });

  socket.on('video-load', async ({ roomId, url }) => {
    io.to(roomId).emit('sync-video-load', { url });
    await Room.findOneAndUpdate({ roomId }, { videoUrl: url, currentTime: 0 });
  });

  socket.on('update-playlist', ({ roomId, playlist }) => {
    io.to(roomId).emit('sync-playlist', playlist);
  });

  socket.on('send-message', ({ roomId, message, sender }) => {
    io.to(roomId).emit('receive-message', { message, sender, timestamp: new Date() });
  });

  // WebRTC Signaling
  socket.on('start-video-call', ({ roomId }) => {
    socket.to(roomId).emit('user-started-call', { sender: socket.id });
  });

  socket.on('video-offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('video-offer', { offer, sender: socket.id });
  });

  socket.on('video-answer', ({ roomId, answer, target }) => {
    io.to(target).emit('video-answer', { answer, sender: socket.id });
  });

  socket.on('new-ice-candidate', ({ roomId, candidate, target }) => {
    const dest = target || roomId;
    if (target) {
      io.to(target).emit('new-ice-candidate', { candidate, sender: socket.id });
    } else {
      socket.to(roomId).emit('new-ice-candidate', { candidate, sender: socket.id });
    }
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(roomId => {
      const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        .map(sid => {
          const s = io.sockets.sockets.get(sid);
          return { id: sid, name: s?.data?.user?.name || 'Guest' };
        });
      io.to(roomId).emit('update-members', roomUsers);
    });
    console.log('User disconnected:', socket.id);
  });
});

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wavvy';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
