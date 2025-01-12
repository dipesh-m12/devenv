// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Initialize express and socket.io
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGO_URI ||
      "mongodb+srv://mavinash422:kSXwqEAWiVbUXkLa@cluster0.yefvx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

// Section Schema
const sectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);
const Section = mongoose.model("Section", sectionSchema);

// Validation Schema
const sectionValidation = z.object({
  title: z.string().min(1, "Title is required").max(100),
  content: z.string().optional(),
});

// Utility Functions
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validateSection = (req, res, next) => {
  try {
    req.body = sectionValidation.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: "Validation failed",
      details: error.errors,
    });
  }
};

app.get("/", (req, res) => {
  res.send("dipenv running...");
});

// API Routes
app.get(
  "/api/sections",
  asyncHandler(async (req, res) => {
    const sections = await Section.find().sort({ createdAt: -1 });
    res.json(sections);
  })
);

app.post(
  "/api/sections",
  validateSection,
  asyncHandler(async (req, res) => {
    const section = await Section.create(req.body);
    io.emit("sections:created", section); // Broadcast to all except sender
    res.status(201).json(section);
  })
);

app.patch(
  "/api/sections/:id",
  validateSection,
  asyncHandler(async (req, res) => {
    const section = await Section.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!section) {
      res.status(404);
      throw new Error("Section not found");
    }

    io.emit("sections:updated", section); // Broadcast to all except sender
    res.json(section);
  })
);

app.delete(
  "/api/sections/:id",
  asyncHandler(async (req, res) => {
    const section = await Section.findOneAndDelete({ id: req.params.id });

    if (!section) {
      res.status(404);
      throw new Error("Section not found");
    }

    io.emit("sections:deleted", req.params.id); // Broadcast to all except sender
    res.json({ message: "Section removed" });
  })
);

// Socket.IO Setup
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("sections:subscribe", async () => {
    try {
      const sections = await Section.find().sort({ createdAt: -1 });
      socket.emit("sections:initial", sections);
    } catch (error) {
      socket.emit("error", { message: "Failed to fetch sections" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
