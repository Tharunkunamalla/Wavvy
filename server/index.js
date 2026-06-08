import express from "express";
import http from "http";
import {Server} from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import roomRoutes from "./routes/room.js";
import { socketHandler } from "./socket/socketHandler.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3001;

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  }),
);
app.use(express.json());

// Routes
app.use("/api", roomRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true
});

// Initialize socket handling
socketHandler(io);

// Start server immediately so Render health checks pass
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Attempting to connect to MongoDB...");
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:");
    console.error(err.message);
    console.log("Check if your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas.");
  });
