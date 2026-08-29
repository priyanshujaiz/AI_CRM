import type { Request } from "express";

/**
 * Authenticated user shape returned by the auth endpoints and attached to
 * requests by the auth middleware. The password hash is NEVER part of this type.
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

/** Payload embedded in the signed JWT (HS256). Times are Unix seconds. */
export interface TokenPayload {
  sub: string; // user id
  email: string;
  iat: number; // issued at (Unix seconds)
  exp: number; // expires at (Unix seconds) — 24h after iat
}

/** Full user row as persisted by a UserStore (includes the password hash). */
export interface StoredUser extends AuthUser {
  passwordHash: string;
}

/** Express request that may carry an authenticated user (set by requireAuth / optionalAuth). */
export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Expected client error thrown by the auth service / middleware.
 * Carries the HTTP status the controller / middleware should respond with,
 * plus a machine-readable code.
 */
export class AuthError extends Error {
  public readonly code: string;

  constructor(
    public readonly status: number,
    message: string,
    code: string,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

// Make req.user available on plain Express Request too, so any handler registered
// behind requireAuth can read it without casting.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}