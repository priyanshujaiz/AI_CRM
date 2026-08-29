import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { AuthService, InMemoryUserStore } from "../services/authService.js";
import { AuthController } from "../controllers/authController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import type { AuthRequest } from "../types/auth.js";

// Deterministic secret for every test — set before any JWT operation.
const TEST_SECRET = "auth-test-secret-0123456789";
const ORIGINAL_SECRET = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = ORIGINAL_SECRET;
});

// ---------------------------------------------------------------------------
// Fakes — minimal Express req/res so handlers/middleware run without a server.
// ---------------------------------------------------------------------------

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: any };
}

function makeReq(body?: unknown, headers?: Record<string, string>): AuthRequest {
  return {
    body,
    headers: headers ?? {},
  } as unknown as AuthRequest;
}

function freshController(): AuthController {
  return new AuthController(new AuthService(new InMemoryUserStore()));
}

// ---------------------------------------------------------------------------
// POST /signup
// ---------------------------------------------------------------------------

describe("AuthController.signup", () => {
  it("rejects an invalid email format with 400", async () => {
    const res = makeRes();
    const next = vi.fn();
    await freshController().signup(makeReq({ email: "not-an-email", password: "password123" }), res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ success: false });
  });

  it("rejects a password shorter than 8 characters with 400", async () => {
    const res = makeRes();
    const next = vi.fn();
    await freshController().signup(makeReq({ email: "person@example.com", password: "short" }), res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false });
  });

  it("rejects a request with a missing/empty body with 400", async () => {
    const res = makeRes();
    const next = vi.fn();
    await freshController().signup(makeReq(undefined), res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false });
  });

  it("creates a user and returns 201 with token and user", async () => {
    const res = makeRes();
    const next = vi.fn();
    await freshController().signup(
      makeReq({ email: "Ann@Example.COM", password: "password123", name: "Ann" }),
      res,
      next,
    );

    expect(res.statusCode).toBe(201);
    expect(next).not.toHaveBeenCalled();
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({ email: "ann@example.com", name: "Ann", id: expect.any(String) });
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const payload = AuthService.verifyToken(res.body.token);
    expect(payload.sub).toBe(res.body.user.id);
    expect(payload.email).toBe("ann@example.com");
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  it("returns 409 on duplicate email (case-insensitive)", async () => {
    const ctrl = freshController();

    const first = makeRes();
    await ctrl.signup(makeReq({ email: "dup@example.com", password: "password123" }), first, vi.fn());
    expect(first.statusCode).toBe(201);

    const second = makeRes();
    await ctrl.signup(makeReq({ email: "DUP@example.com", password: "password456" }), second, vi.fn());

    expect(second.statusCode).toBe(409);
    expect(second.body).toMatchObject({ success: false, code: "EMAIL_TAKEN" });
  });
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

describe("AuthController.login", () => {
  async function createLoggedInUser() {
    const ctrl = freshController();
    await ctrl.signup(
      makeReq({ email: "user@example.com", password: "password123", name: "Sam" }),
      makeRes(),
      vi.fn(),
    );
    return ctrl;
  }

  it("returns 200 with token and user on valid credentials", async () => {
    const ctrl = await createLoggedInUser();
    const res = makeRes();
    await ctrl.login(makeReq({ email: "USER@example.com", password: "password123" }), res, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({ email: "user@example.com", name: "Sam" });
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(AuthService.verifyToken(res.body.token).sub).toBe(res.body.user.id);
  });

  it("returns 401 for an unknown email", async () => {
    const ctrl = await createLoggedInUser();
    const res = makeRes();
    await ctrl.login(makeReq({ email: "nobody@example.com", password: "password123" }), res, vi.fn());

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  it("returns 401 for a wrong password", async () => {
    const ctrl = await createLoggedInUser();
    const res = makeRes();
    await ctrl.login(makeReq({ email: "user@example.com", password: "wrong-password" }), res, vi.fn());

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: "Invalid email or password." });
  });
});

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

describe("requireAuth", () => {
  const user = { id: "user-1", email: "user@example.com" };

  it("attaches the user and calls next for a valid token", () => {
    const req = makeReq(undefined, { authorization: `Bearer ${AuthService.signToken(user)}` });
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(user);
    expect(res.statusCode).toBe(200); // untouched
  });

  it("rejects a request without an Authorization header with 401", () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ success: false });
  });

  it("rejects a malformed Authorization header with 401", () => {
    const req = makeReq(undefined, { authorization: "Basic dXNlcjpwYXNz" });
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a garbage token with 401", () => {
    const req = makeReq(undefined, { authorization: "Bearer not.a.jwt" });
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_TOKEN" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a token signed with a different secret with 401", () => {
    const req = makeReq(undefined, { authorization: `Bearer ${AuthService.signToken(user)}` });
    process.env.JWT_SECRET = "some-other-secret";
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_TOKEN" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an expired token with 401", () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = AuthService.signTokenPayload({
      sub: user.id,
      email: user.email,
      iat: now - 7200,
      exp: now - 3600,
    });
    const req = makeReq(undefined, { authorization: `Bearer ${expired}` });
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "TOKEN_EXPIRED", error: "Token expired." });
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// optionalAuth
// ---------------------------------------------------------------------------

describe("optionalAuth", () => {
  it("attaches the user and calls next for a valid token", () => {
    const req = makeReq(undefined, {
      authorization: `Bearer ${AuthService.signToken({ id: "u1", email: "a@b.com" })}`,
    });
    const res = makeRes();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(req.user).toEqual({ id: "u1", email: "a@b.com" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("calls next without attaching a user for a missing/invalid token", () => {
    const req = makeReq(undefined, { authorization: "Bearer garbage" });
    const res = makeRes();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("calls next without attaching a user when no Authorization header is present", () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});