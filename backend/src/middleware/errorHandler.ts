import type { Request, Response, NextFunction } from "express";
import { Logger } from "../utils/logger.js";

/**
 * Global Express error handling middleware.
 * Must be registered LAST with app.use() so it catches errors
 * forwarded via next(error) from any route or middleware.
 *
 * Handles:
 *  - Multer file size errors (413)
 *  - Generic Express validation errors (400)
 *  - All other unhandled server errors (500)
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction  // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  // Multer file too large
  if (err.code === "LIMIT_FILE_SIZE") {
    Logger.warn("File upload rejected: exceeds 5MB size limit.", "ErrorHandler");
    res.status(413).json({
      success: false,
      error: "File too large. Maximum allowed size is 5MB.",
    });
    return;
  }

  // Multer unexpected field / wrong form key
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    Logger.warn(`Unexpected file field received: ${err.field}`, "ErrorHandler");
    res.status(400).json({
      success: false,
      error: `Unexpected file field "${err.field}". Use the field name "file".`,
    });
    return;
  }

  // Generic 4xx-type errors explicitly set on the error object
  if (err.status && err.status >= 400 && err.status < 500) {
    Logger.warn(`Client error ${err.status}: ${err.message}`, "ErrorHandler");
    res.status(err.status).json({
      success: false,
      error: err.message || "Bad request.",
    });
    return;
  }

  // Catch-all: unexpected server errors
  Logger.error(
    "Unhandled server error caught by global error handler.",
    "ErrorHandler",
    err
  );

  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "An unexpected internal server error occurred."
        : err.message || "Unknown error.",
  });
}
