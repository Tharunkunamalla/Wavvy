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
    origin: "*", // More permissive for dev
    methods: ["GET", "POST"]
  }
});

// Helper to get all members in a room with their socket data
const getRoomMembers = async (roomId) => {
  const room = await Room.findOne({ roomId });
  const socketIds = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
  
  return socketIds.map(sid => {
    const s = io.sockets.sockets.get(sid);
    if (!s) return null;
    return {
      id: sid,
      name: s.data.user?.name || 'Guest',
      email: s.data.user?.email || '',
      isHost: s.data.isHost || (room && room.creatorEmail === s.data.user?.email),
      canControl: s.data.canControl || (room && room.creatorEmail === s.data.user?.email)
    };
  }).filter(Boolean);
};

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join-room', async ({ roomId, user }) => {
    if (!user) return;
    
    socket.join(roomId);
    socket.data.user = user;
    
    let room = await Room.findOne({ roomId });
    
    // Determine if this user is the host
    const isOwner = room ? room.creatorEmail === user.email : true;
    
    if (!room) {
      room = await Room.create({
        roomId,
        hostId: socket.id,
        creatorEmail: user.email,
        members: [{ id: socket.id, name: user.name, email: user.email }]
      });
      socket.data.isHost = true;
      socket.data.canControl = true;
    } else {
      if (isOwner) {
        socket.data.isHost = true;
        socket.data.canControl = true;
        room.hostId = socket.id;
        await room.save();
      } else {
        socket.data.isHost = false;
        socket.data.canControl = false;
      }
    }

    // Emit initial state
    socket.emit('sync-video-load', { url: room.videoUrl });
    socket.emit('sync-video', { 
      state: room.isPlaying ? 'playing' : 'paused', 
      time: room.currentTime 
    });
    socket.emit('sync-playlist', room.playlist || []);
    
    // Broadcast updated member list
    const members = await getRoomMembers(roomId);
    io.to(roomId).emit('update-members', members);
  });

  socket.on('video-state-change', async ({ roomId, state, time }) => {
    if (socket.data.canControl) {
      socket.to(roomId).emit('sync-video', { state, time });
      await Room.findOneAndUpdate({ roomId }, { 
        isPlaying: state === 'playing', 
        currentTime: time 
      });
    }
  });

  socket.on('video-load', async ({ roomId, url }) => {
    if (socket.data.canControl) {
      io.to(roomId).emit('sync-video-load', { url });
      await Room.findOneAndUpdate({ roomId }, { 
        videoUrl: url, 
        currentTime: 0,
        isPlaying: true 
      });
    }
  });

  socket.on('send-message', ({ roomId, message, sender }) => {
    io.to(roomId).emit('receive-message', { message, sender, timestamp: new Date() });
  });

  socket.on('add-to-playlist', async ({ roomId, url }) => {
    const room = await Room.findOne({ roomId });
    if (room) {
      room.playlist.push(url);
      await room.save();
      io.to(roomId).emit('sync-playlist', room.playlist);
    }
  });

  socket.on('remove-from-playlist', async ({ roomId, index }) => {
    if (socket.data.canControl) {
      const room = await Room.findOne({ roomId });
      if (room) {
        room.playlist.splice(index, 1);
        await room.save();
        io.to(roomId).emit('sync-playlist', room.playlist);
      }
    }
  });

  socket.on('kick-user', async ({ roomId, targetId }) => {
    if (socket.data.isHost) {
       io.to(targetId).emit('kicked');
       const targetSocket = io.sockets.sockets.get(targetId);
       if (targetSocket) targetSocket.leave(roomId);
    }
  });

  socket.on('toggle-permission', async ({ roomId, targetId, canControl }) => {
    if (socket.data.isHost) {
       const targetSocket = io.sockets.sockets.get(targetId);
       if (targetSocket) {
         targetSocket.data.canControl = canControl;
         const members = await getRoomMembers(roomId);
         io.to(roomId).emit('update-members', members);
       }
    }
  });

  socket.on('disconnecting', async () => {
    const rooms = Array.from(socket.rooms);
    for (const roomId of rooms) {
      if (roomId !== socket.id) {
        // Delay slightly to allow adapter to update
        setTimeout(async () => {
          const members = await getRoomMembers(roomId);
          io.to(roomId).emit('update-members', members);
        }, 100);
      }
    }
  });
});

const PORT = 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wavvy';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error(err));
