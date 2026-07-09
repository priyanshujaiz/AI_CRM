import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import leadsRouter from "./routes/leads.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { Logger } from "./utils/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

// HTTP request logger — logs every incoming request
app.use((req, _res, next) => {
  Logger.info(`${req.method} ${req.url}`, "HTTP", {
    ip: req.ip,
    contentType: req.headers["content-type"],
  });
  next();
});

// Rate limiter: max 30 import requests per IP per 15 minutes
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many import requests from this IP. Please wait 15 minutes before trying again.",
  },
});

// Routes
app.use("/api/leads", importLimiter, leadsRouter);

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Backend is running 🚀",
  });
});

// Global error handler — must be registered LAST
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  Logger.info(`Server running on http://localhost:${PORT}`, "Server");
  Logger.info(`Environment: ${process.env.NODE_ENV || "development"}`, "Server");
  Logger.info("Rate limiting: 30 requests / IP / 15 min on /api/leads", "Server");
});