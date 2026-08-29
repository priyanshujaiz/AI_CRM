import type { NextFunction, Request, Response } from "express";
import { AuthService, authService as defaultAuthService } from "../services/authService.js";
import { AuthError } from "../types/auth.js";
import { Logger } from "../utils/logger.js";

/**
 * HTTP handlers for auth endpoints.
 *
 * Instance-based (bound arrow properties) so tests can inject a service with a
 * fresh in-memory store, and so the Prisma integration pass can construct
 * `new AuthController(new AuthService(new PrismaUserStore(...)))` without
 * touching the routes.
 */
export class AuthController {
  constructor(private readonly authService: AuthService = defaultAuthService) {}

  /**
   * POST /signup
   * Validates email format + password (min 8 chars) via the service, returns
   * 201 { token, user } or 400 / 409 on validation / duplicate email.
   */
  public signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const email = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";
      const name = typeof body.name === "string" ? body.name : undefined;

      const { token, user } = await this.authService.signup(
        name !== undefined ? { email, password, name } : { email, password },
      );
      Logger.info(`New user signed up: ${user.email}`, "AuthController");
      res.status(201).json({ token, user });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  /**
   * POST /login
   * Exchanges credentials for a token; 401 on bad credentials, 200 { token, user } on success.
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const email = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";

      const { token, user } = await this.authService.login({ email, password });
      Logger.info(`User logged in: ${user.email}`, "AuthController");
      res.status(200).json({ token, user });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  /** Maps expected auth errors to HTTP responses; forwards unexpected errors to Express. */
  private handleError(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof AuthError) {
      Logger.warn(`Auth request failed (${error.status}): ${error.message}`, "AuthController", error);
      res.status(error.status).json({ success: false, error: error.message, code: error.code });
      return;
    }
    next(error);
  }
}

/**
 * Default singleton. Routes/auth.ts uses this instance.
 *
 * Prisma integration pass — swap the store here (one line), callers stay the same:
 *   export const authController = new AuthController(
 *     new AuthService(new PrismaUserStore(prisma)),
 *   );
 */
export const authController = new AuthController(new AuthService());