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
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Helper to clean YouTube URLs
const cleanUrl = (url) => {
  if (!url) return '';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return url.split('&')[0];
  }
  return url;
};

// Helper to get all members in a room with their socket data
const getRoomMembers = async (roomId) => {
  try {
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
  } catch (err) {
    console.error('Error fetching members:', err);
    return [];
  }
};

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join-room', async ({ roomId, user }) => {
    if (!user) return;
    
    try {
      socket.join(roomId);
      socket.data.user = user;
      
      let room = await Room.findOne({ roomId });
      
      // Determine if this user is the host (creator)
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
    } catch (err) {
      console.error('Join room error:', err);
    }
  });

  socket.on('video-state-change', async ({ roomId, state, time }) => {
    try {
      if (socket.data.canControl) {
        socket.to(roomId).emit('sync-video', { state, time });
        await Room.findOneAndUpdate({ roomId }, { 
          isPlaying: state === 'playing', 
          currentTime: time 
        });
      }
    } catch (err) {
      console.error('State change sync error:', err);
    }
  });

  socket.on('video-load', async ({ roomId, url }) => {
    try {
      if (socket.data.canControl) {
        const cleaned = cleanUrl(url);
        io.to(roomId).emit('sync-video-load', { url: cleaned });
        await Room.findOneAndUpdate({ roomId }, { 
          videoUrl: cleaned, 
          currentTime: 0,
          isPlaying: true 
        });
      }
    } catch (err) {
      console.error('Video load error:', err);
    }
  });

  socket.on('send-message', ({ roomId, message, sender }) => {
    io.to(roomId).emit('receive-message', { message, sender, timestamp: new Date() });
  });

  socket.on('add-to-playlist', async ({ roomId, url }) => {
    try {
      // Basic validation
      if (!url.includes("youtube.com") && !url.includes("youtu.be") && !url.includes("dropbox.com")) {
        return; 
      }

      const room = await Room.findOne({ roomId });
      if (room) {
        const cleaned = cleanUrl(url);
        room.playlist.push(cleaned);
        await room.save();
        io.to(roomId).emit('sync-playlist', room.playlist);
      }
    } catch (err) {
      console.error('Add to playlist error:', err);
    }
  });

  socket.on('remove-from-playlist', async ({ roomId, index }) => {
    try {
      if (socket.data.canControl) {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.playlist.splice(index, 1);
          await room.save();
          io.to(roomId).emit('sync-playlist', room.playlist);
        }
      }
    } catch (err) {
      console.error('Remove from playlist error:', err);
    }
  });

  socket.on('kick-user', async ({ roomId, targetId }) => {
    try {
      if (socket.data.isHost) {
         io.to(targetId).emit('kicked');
         const targetSocket = io.sockets.sockets.get(targetId);
         if (targetSocket) targetSocket.leave(roomId);
      }
    } catch (err) {
      console.error('Kick user error:', err);
    }
  });

  socket.on('toggle-permission', async ({ roomId, targetId, canControl }) => {
    try {
      if (socket.data.isHost) {
         const targetSocket = io.sockets.sockets.get(targetId);
         if (targetSocket) {
           targetSocket.data.canControl = canControl;
           const members = await getRoomMembers(roomId);
           io.to(roomId).emit('update-members', members);
         }
      }
    } catch (err) {
      console.error('Toggle permission error:', err);
    }
  });

  socket.on('disconnecting', async () => {
    const rooms = Array.from(socket.rooms);
    for (const roomId of rooms) {
      if (roomId !== socket.id) {
        // Increased delay to 200ms to allow adapter to update correctly
        setTimeout(async () => {
          const members = await getRoomMembers(roomId);
          io.to(roomId).emit('update-members', members);
        }, 200);
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
