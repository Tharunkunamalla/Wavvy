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

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit('user-joined', { userId: socket.id });
  });

  socket.on('video-state-change', ({ roomId, state, time }) => {
    // state can be 'playing', 'paused', 'seeking'
    socket.to(roomId).emit('sync-video', { state, time });
  });

  socket.on('video-load', ({ roomId, url }) => {
    io.to(roomId).emit('sync-video-load', { url });
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

  socket.on('disconnect', () => {
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
