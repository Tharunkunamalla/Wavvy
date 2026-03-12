import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Room from './models/Room.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', async ({ roomId, user }) => {
    socket.join(roomId);
    socket.data.user = user;
    socket.data.canControl = false; // Default: no control
    
    let room = await Room.findOne({ roomId });
    if (!room) {
      room = await Room.create({
        roomId,
        hostId: socket.id,
        members: [{ id: socket.id, name: user.name, email: user.email }]
      });
      socket.data.canControl = true; // Host always has control
    } else {
      // If it's the host reconnecting or first join
      if (room.members.length === 0 || room.hostId === socket.id) {
        socket.data.canControl = true;
      }
      
      if (!room.members.find(m => m.id === socket.id)) {
        room.members.push({ id: socket.id, name: user.name, email: user.email });
        await room.save();
      }
    }

    // Sync state
    socket.emit('sync-video-load', { url: room.videoUrl });
    socket.emit('sync-video', { state: room.isPlaying ? 'playing' : 'paused', time: room.currentTime });
    
    // Broadcast updated member list with permissions
    const updateMembers = () => {
      const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        .map(sid => {
          const s = io.sockets.sockets.get(sid);
          return { 
            id: sid, 
            name: s?.data?.user?.name || 'Guest',
            isHost: room.hostId === sid,
            canControl: s?.data?.canControl || room.hostId === sid
          };
        });
      io.to(roomId).emit('update-members', roomUsers);
    };

    updateMembers();
    console.log(`User ${user.name} joined room ${roomId}`);
  });

  socket.on('video-state-change', async ({ roomId, state, time }) => {
    // Only allow if user has permission
    if (socket.data.canControl || (await Room.findOne({ roomId, hostId: socket.id }))) {
      socket.to(roomId).emit('sync-video', { state, time });
      await Room.findOneAndUpdate({ roomId }, { 
        isPlaying: state === 'playing',
        currentTime: time 
      });
    }
  });

  socket.on('video-load', async ({ roomId, url }) => {
    if (socket.data.canControl || (await Room.findOne({ roomId, hostId: socket.id }))) {
      io.to(roomId).emit('sync-video-load', { url });
      await Room.findOneAndUpdate({ roomId }, { videoUrl: url, currentTime: 0 });
    }
  });

  socket.on('send-message', ({ roomId, message, sender }) => {
    io.to(roomId).emit('receive-message', { message, sender, timestamp: new Date() });
  });

  // Admin Controls
  socket.on('kick-user', async ({ roomId, targetId }) => {
    const room = await Room.findOne({ roomId });
    if (room && room.hostId === socket.id) {
       io.to(targetId).emit('kicked');
       const targetSocket = io.sockets.sockets.get(targetId);
       if (targetSocket) targetSocket.leave(roomId);
    }
  });

  socket.on('toggle-permission', async ({ roomId, targetId, canControl }) => {
    const room = await Room.findOne({ roomId });
    if (room && room.hostId === socket.id) {
       const targetSocket = io.sockets.sockets.get(targetId);
       if (targetSocket) {
         targetSocket.data.canControl = canControl;
         // Trigger member update
         const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
          .map(sid => {
            const s = io.sockets.sockets.get(sid);
            return { 
              id: sid, 
              name: s?.data?.user?.name || 'Guest',
              isHost: room.hostId === sid,
              canControl: s?.data?.canControl || room.hostId === sid
            };
          });
         io.to(roomId).emit('update-members', roomUsers);
       }
    }
  });

  // WebRTC Signaling with Names
  socket.on('start-video-call', ({ roomId }) => {
    socket.to(roomId).emit('user-started-call', { 
      sender: socket.id, 
      name: socket.data.user?.name || 'Guest' 
    });
  });

  socket.on('video-offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('video-offer', { 
      offer, 
      sender: socket.id,
      name: socket.data.user?.name || 'Guest'
    });
  });

  socket.on('video-answer', ({ roomId, answer, target }) => {
    io.to(target).emit('video-answer', { 
      answer, 
      sender: socket.id,
      name: socket.data.user?.name || 'Guest'
    });
  });

  socket.on('new-ice-candidate', ({ roomId, candidate, target }) => {
    if (target) {
      io.to(target).emit('new-ice-candidate', { candidate, sender: socket.id });
    } else {
      socket.to(roomId).emit('new-ice-candidate', { candidate, sender: socket.id });
    }
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(async (roomId) => {
      const room = await Room.findOne({ roomId });
      if (room) {
        const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
          .filter(sid => sid !== socket.id)
          .map(sid => {
            const s = io.sockets.sockets.get(sid);
            return { 
              id: sid, 
              name: s?.data?.user?.name || 'Guest',
              isHost: room.hostId === sid,
              canControl: s?.data?.canControl || room.hostId === sid
            };
          });
        io.to(roomId).emit('update-members', roomUsers);
      }
    });
  });
});

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wavvy';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error(err));
