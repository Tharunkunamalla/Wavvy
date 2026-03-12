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

io.on('connection', (socket) => {
  socket.on('join-room', async ({ roomId, user }) => {
    socket.join(roomId);
    socket.data.user = user;
    
    let room = await Room.findOne({ roomId });
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
      if (room.creatorEmail === user.email) {
        socket.data.isHost = true;
        socket.data.canControl = true;
        room.hostId = socket.id; // Update host socket ID
        await room.save();
      } else {
        socket.data.isHost = false;
        // Check if user was previously granted control (optional, for now keep simple)
        socket.data.canControl = false;
      }
      
      if (!room.members.find(m => m.id === socket.id)) {
        room.members.push({ id: socket.id, name: user.name, email: user.email });
        await room.save();
      }
    }

    socket.emit('sync-video-load', { url: room.videoUrl });
    socket.emit('sync-video', { state: room.isPlaying ? 'playing' : 'paused', time: room.currentTime });
    socket.emit('sync-playlist', room.playlist);
    
    const updateMembers = () => {
      const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        .map(sid => {
          const s = io.sockets.sockets.get(sid);
          return { 
            id: sid, 
            name: s?.data?.user?.name || 'Guest',
            isHost: s?.data?.isHost || false,
            canControl: s?.data?.canControl || false
          };
        });
      io.to(roomId).emit('update-members', roomUsers);
    };

    updateMembers();
  });

  socket.on('video-state-change', async ({ roomId, state, time }) => {
    if (socket.data.canControl) {
      socket.to(roomId).emit('sync-video', { state, time });
      await Room.findOneAndUpdate({ roomId }, { isPlaying: state === 'playing', currentTime: time });
    }
  });

  socket.on('video-load', async ({ roomId, url }) => {
    if (socket.data.canControl) {
      io.to(roomId).emit('sync-video-load', { url });
      await Room.findOneAndUpdate({ roomId }, { videoUrl: url, currentTime: 0 });
    }
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

  socket.on('send-message', ({ roomId, message, sender }) => {
    io.to(roomId).emit('receive-message', { message, sender, timestamp: new Date() });
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
         const room = await Room.findOne({ roomId });
         const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
          .map(sid => {
            const s = io.sockets.sockets.get(sid);
            return { 
              id: sid, 
              name: s?.data?.user?.name || 'Guest',
              isHost: s?.data?.isHost || false,
              canControl: s?.data?.canControl || false
            };
          });
         io.to(roomId).emit('update-members', roomUsers);
       }
    }
  });

  socket.on('start-video-call', ({ roomId }) => {
    socket.to(roomId).emit('user-started-call', { sender: socket.id, name: socket.data.user?.name || 'Guest' });
  });

  socket.on('video-offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('video-offer', { offer, sender: socket.id, name: socket.data.user?.name || 'Guest' });
  });

  socket.on('video-answer', ({ roomId, answer, target }) => {
    io.to(target).emit('video-answer', { answer, sender: socket.id, name: socket.data.user?.name || 'Guest' });
  });

  socket.on('new-ice-candidate', ({ roomId, candidate, target }) => {
    if (target) io.to(target).emit('new-ice-candidate', { candidate, sender: socket.id });
    else socket.to(roomId).emit('new-ice-candidate', { candidate, sender: socket.id });
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
              isHost: s?.data?.isHost || false,
              canControl: s?.data?.canControl || false
            };
          });
        io.to(roomId).emit('update-members', roomUsers);
      }
    });
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
