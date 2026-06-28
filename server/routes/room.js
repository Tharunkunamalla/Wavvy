import express from "express";
import Room from "../models/Room.js";

const router = express.Router();

// API endpoint to check if room exists
router.get("/check-room", async (req, res) => {
  try {
    const {roomId} = req.query;
    if (!roomId) {
      return res.status(400).json({error: "Room ID is required"});
    }
    const room = await Room.findOne({roomId});
    if (room) {
      return res.json({exists: true});
    } else {
      return res.json({exists: false});
    }
  } catch (error) {
    console.error("Error checking room:", error);
    res.status(500).json({error: "Server error"});
  }
});

// API endpoint to get active public rooms
router.get("/public-rooms", async (req, res) => {
  try {
    const rooms = await Room.find({ isPublic: true, activeMembersCount: { $gt: 0 } })
      .select("roomId roomName creatorEmail activeMembersCount createdAt")
      .sort({ activeMembersCount: -1, createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    console.error("Error fetching public rooms:", error);
    res.status(500).json({error: "Server error"});
  }
});

export default router;
