import type { NextFunction, Response } from "express";
import { AuthService } from "../services/authService.js";
import { AuthError } from "../types/auth.js";
import type { AuthRequest, AuthUser, TokenPayload } from "../types/auth.js";

const AUTH_SCHEME = "Bearer";

/** Extracts a Bearer token from the Authorization header, or null if missing/malformed. */
export function extractBearerToken(req: AuthRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token, ...rest] = header.split(" ");
  if (scheme !== AUTH_SCHEME || !token || rest.length > 0) return null;
  return token;
}

function payloadToUser(payload: TokenPayload): AuthUser {
  return { id: payload.sub, email: payload.email };
}

/**
 * Guards a route: 401 unless a valid, unexpired Bearer token is present.
 * On success attaches the authenticated user to req.user and calls next().
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Provide a valid Bearer token.",
      code: "AUTH_REQUIRED",
    });
    return;
  }

  try {
    const payload = AuthService.verifyToken(token);
    req.user = payloadToUser(payload);
    next();
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({ success: false, error: error.message, code: error.code });
      return;
    }
    res.status(401).json({ success: false, error: "Invalid token.", code: "INVALID_TOKEN" });
  }
}

/**
 * Optional auth: attaches req.user when a valid token is present, but NEVER
 * fails the request — missing, malformed, invalid, or expired tokens are
 * ignored and the request continues unauthenticated.
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (token) {
    try {
      req.user = payloadToUser(AuthService.verifyToken(token));
    } catch {
      // Invalid or expired token — proceed as an anonymous request.
    }
  }
  next();
}