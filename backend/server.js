import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { setNotificationSocket } from "./utils/createNotification.js";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import bootstrapDefaults from "./config/bootstrap.js";
import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import recruiterRoutes from "./routes/recruiterRoutes.js";
import recruiterCvRoutes from "./routes/recruiterCvRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminAdvancedRoutes from "./routes/adminAdvancedRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: true, credentials: true }, transports: ["websocket", "polling"] });

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id || decoded._id || decoded.userId;
    if (!socket.userId) return next(new Error("Invalid authentication token"));
    next();
  } catch { next(new Error("Invalid authentication token")); }
});
io.on("connection", (socket) => {
  socket.join(`user:${String(socket.userId)}`);
  socket.emit("notification:connected", { ok: true });
});
setNotificationSocket(io);

// ============================================================
// ENVIRONMENT
// ============================================================

const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  "https://job-search-website-ow8q.onrender.com",
];

// Add CLIENT_URL from Render if it exists
if (
  process.env.CLIENT_URL &&
  !allowedOrigins.includes(process.env.CLIENT_URL)
) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

console.log("========================================");
console.log("Jobify API starting...");
console.log("NODE_ENV:", process.env.NODE_ENV || "development");
console.log("CLIENT_URL:", process.env.CLIENT_URL || "NOT SET");
console.log("Allowed origins:", allowedOrigins);
console.log("========================================");

// ============================================================
// CORS
// ============================================================

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an Origin header
    // such as Postman, curl, server-to-server requests, etc.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("Blocked CORS origin:", origin);

    // Do not throw an error.
    // This prevents CORS middleware from generating a 500 error.
    return callback(null, false);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ============================================================
// BODY PARSING
// ============================================================

app.use(express.json({ limit: "10mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Jobify API is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Jobify API is healthy",
  });
});

// ============================================================
// AUTH ROUTES
// ============================================================

app.use("/api/auth", authRoutes);

// ============================================================
// JOB ROUTES
// ============================================================

app.use("/api", jobRoutes);

// ============================================================
// ADMIN ROUTES
// ============================================================

app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminAdvancedRoutes);

// ============================================================
// APPLICATION ROUTES
// ============================================================

app.use("/api/applications", applicationRoutes);

// ============================================================
// FILE ROUTES
// ============================================================

app.use("/api/files", fileRoutes);

// ============================================================
// PROFILE ROUTES
// ============================================================

app.use("/api/profile", profileRoutes);

// ============================================================
// COMPANY ROUTES
// ============================================================

app.use("/api/companies", companyRoutes);

// ============================================================
// RECRUITER ROUTES
// ============================================================

app.use("/api/recruiter", recruiterRoutes);
app.use("/api/recruiter", recruiterCvRoutes);

// ============================================================
// PAYMENT ROUTES
// ============================================================

app.use("/api/payments", paymentRoutes);

// ============================================================
// REPORT ROUTES
// ============================================================

app.use("/api/reports", reportRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/notifications", notificationRoutes);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err);

  if (err?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed.",
    });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large.",
    });
  }

  if (err instanceof SyntaxError && err?.status === 400) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
  }

  return res.status(500).json({
    success: false,
    message: err?.message || "Internal server error.",
  });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ============================================================
// START SERVER
// ============================================================

async function startServer() {
  try {
    // Connect to MongoDB before accepting API requests.
    await connectDB();

    console.log("MongoDB connected successfully");

    // Create default platform data
    try {
      await bootstrapDefaults();
      console.log("Bootstrap defaults completed");
    } catch (error) {
      console.error("Bootstrap defaults error:", error);
    }

    // Start Express
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log("========================================");
      console.log(`Jobify API running on port ${PORT}`);
      console.log("Health: /health");
      console.log("Login: /api/auth/login");
      console.log("========================================");
    });
  } catch (error) {
    console.error("========================================");
    console.error("MongoDB connection failed:");
    console.error(error);
    console.error("========================================");

    // Stop the service so Render reports the backend
    // as unhealthy instead of leaving a broken API running.
    process.exit(1);
  }
}

startServer();