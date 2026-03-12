import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  hostId: { // This will still exist but we'll prioritize creatorEmail
    type: String,
    required: true
  },
  creatorEmail: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    default: ''
  },
  currentTime: {
    type: Number,
    default: 0
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  playlist: {
    type: [String],
    default: []
  },
  members: [{
    id: String, // socket.id
    name: String,
    email: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Room', roomSchema);
