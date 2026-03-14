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

// API endpoint to check if room exists
app.get('/api/check-room', async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    const room = await Room.findOne({ roomId });
    if (room) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking room:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper to clean YouTube URLs
const cleanUrl = (url) => {
  if (!url) return '';
  const trimmedUrl = url.trim();
  const match = trimmedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/watch?v=${match[1]}`;
  }
  return trimmedUrl;
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
      socket.data.name = user.name; // Explicitly store name for easier access
      
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
      const initialUrl = cleanUrl(room.videoUrl);
      socket.emit('sync-video-load', { url: initialUrl });
      socket.emit('sync-video', { 
        state: room.isPlaying ? 'playing' : 'paused', 
        time: room.currentTime 
      });
      socket.emit('sync-playlist', room.playlist || []);
      socket.emit('sync-auto-play', room.autoPlayNext);
      
      // Emit chat history
      if (room.messages && room.messages.length > 0) {
        socket.emit('chat-history', room.messages);
      }
      
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
    console.log(`[Server] video-load from ${socket.id} in room ${roomId}: ${url}`);
    try {
      if (socket.data.canControl) {
        const cleaned = cleanUrl(url);
        console.log(`[Server] Broadcasting cleaned URL: ${cleaned}`);
        io.to(roomId).emit('sync-video-load', { url: cleaned });
        io.to(roomId).emit('sync-video', { state: 'playing', time: 0 });

        await Room.findOneAndUpdate({ roomId }, { 
          videoUrl: cleaned, 
          currentTime: 0,
          isPlaying: true 
        }, { new: true });
      } else {
        console.warn(`[Server] Permission denied for ${socket.id} to load video`);
      }
    } catch (err) {
      console.error('Video load error:', err);
    }
  });

  socket.on('send-message', async ({ roomId, message, sender }) => {
    try {
      const msgData = { message, sender, timestamp: new Date() };
      io.to(roomId).emit('receive-message', msgData);
      
      // Save to DB
      await Room.findOneAndUpdate(
        { roomId },
        { $push: { messages: msgData } }
      );
    } catch (err) {
      console.error('Save message error:', err);
    }
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
        // Store both the URL and the person who added it
        room.playlist.push({ 
          url: cleaned, 
          addedBy: socket.data.name || 'Anonymous' 
        });
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

  socket.on('skip-to-next', async ({ roomId }) => {
    console.log(`[Server] skip-to-next by ${socket.id} in room ${roomId}`);
    try {
      if (socket.data.canControl) {
        const room = await Room.findOne({ roomId });
        if (room && room.playlist.length > 0) {
          const nextItem = room.playlist.shift(); 
          const nextUrl = typeof nextItem === 'string' ? nextItem : nextItem.url;
          
          room.videoUrl = nextUrl;
          room.currentTime = 0;
          room.isPlaying = true;
          room.markModified('playlist'); // Critical for mixed arrays
          await room.save();
          
          console.log(`[Server] Next video: ${nextUrl}`);
          io.to(roomId).emit('sync-video-load', { url: nextUrl });
          io.to(roomId).emit('sync-video', { state: 'playing', time: 0 });
          io.to(roomId).emit('sync-playlist', room.playlist);
        } else {
          console.log(`[Server] Playlist empty, cannot skip.`);
        }
      }
    } catch (err) {
      console.error('Skip to next error:', err);
    }
  });

  socket.on('set-playlist', async ({ roomId, playlist }) => {
    try {
      if (socket.data.canControl) {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.playlist = playlist;
          await room.save();
          io.to(roomId).emit('sync-playlist', room.playlist);
        }
      }
    } catch (err) {
      console.error('Set playlist error:', err);
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

  socket.on('toggle-auto-play', async ({ roomId, autoPlayNext }) => {
    try {
      if (socket.data.canControl) {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.autoPlayNext = autoPlayNext;
          await room.save();
          io.to(roomId).emit('sync-auto-play', autoPlayNext);
        }
      }
    } catch (err) {
      console.error('Toggle auto-play error:', err);
    }
  });

  socket.on('kick-user', async ({ roomId, targetId }) => {
    try {
      if (socket.data.isHost) {
         io.to(targetId).emit('kicked');
         const targetSocket = io.sockets.sockets.get(targetId);
         if (targetSocket) {
           targetSocket.leave(roomId);
           const members = await getRoomMembers(roomId);
           io.to(roomId).emit('update-members', members);
         }
      }
    } catch (err) {
      console.error('Kick user error:', err);
    }
  });

  socket.on('join-video-call', ({ roomId }) => {
    socket.join(`${roomId}-video`);
    socket.to(`${roomId}-video`).emit('user-joined-video', { userId: socket.id, userName: socket.data.name });
  });

  socket.on('video-offer', ({ target, caller, sdp }) => {
    io.to(target).emit('video-offer', { caller, sdp });
  });

  socket.on('invite-to-video-call', ({ targetId, callerName }) => {
    io.to(targetId).emit('incoming-video-call', { callerName });
  });

  socket.on('video-invite-response', ({ targetId, accepted, userName }) => {
    io.to(targetId).emit('video-invite-response', { accepted, userName });
  });

  socket.on('video-answer', ({ target, caller, sdp }) => {
    io.to(target).emit('video-answer', { caller, sdp });
  });

  socket.on('video-ice-candidate', ({ target, candidate, caller }) => {
    io.to(target).emit('video-ice-candidate', { candidate, caller });
  });

  socket.on('leave-video-call', ({ roomId }) => {
    socket.leave(`${roomId}-video`);
    socket.to(`${roomId}-video`).emit('user-left-video', { userId: socket.id });
  });

  socket.on('disconnecting', async () => {
    const rooms = Array.from(socket.rooms);
    for (const roomId of rooms) {
      if (roomId.endsWith('-video')) {
        socket.to(roomId).emit('user-left-video', { userId: socket.id });
      } else if (roomId !== socket.id) {
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
