import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { Logger } from "../utils/logger.js";
import { AuthError } from "../types/auth.js";
import type { AuthUser, StoredUser, TokenPayload } from "../types/auth.js";

// ---------------------------------------------------------------------------
// JWT configuration
// ---------------------------------------------------------------------------

const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const DEV_FALLBACK_SECRET = "ai-csv-dev-jwt-secret-do-not-use-in-production";
let warnedAboutFallbackSecret = false;

/**
 * Reads JWT_SECRET from the environment. Falls back to an insecure dev secret
 * (with a one-time WARN) so the app can run without configuration locally —
 * production MUST set JWT_SECRET.
 *
 * Read lazily on every use so tests (and runtime config changes) can set the
 * env var without a module reload.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) return secret;
  if (!warnedAboutFallbackSecret) {
    warnedAboutFallbackSecret = true;
    Logger.warn(
      "JWT_SECRET is not set — using an insecure development fallback. Set JWT_SECRET in production.",
      "AuthService",
    );
  }
  return DEV_FALLBACK_SECRET;
}

// ---------------------------------------------------------------------------
// Password hashing — Node built-in scrypt with a random salt.
// Stored format: scrypt$<N>$<r>$<p>$<saltBase64Url>$<hashBase64Url>
// ---------------------------------------------------------------------------

const SCRYPT_DEFAULTS = { N: 16384, r: 8, p: 1 } as const;
const SCRYPT_KEYLEN = 64;

function deriveKey(
  password: string,
  salt: Buffer,
  keylen: number,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, params, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/** Hashes a plain-text password with scrypt + a fresh random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, SCRYPT_KEYLEN, SCRYPT_DEFAULTS);
  return [
    "scrypt",
    SCRYPT_DEFAULTS.N,
    SCRYPT_DEFAULTS.r,
    SCRYPT_DEFAULTS.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

/** Constant-time verification of a plain-text password against a stored hash string. */
export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, "base64url");
  const expected = Buffer.from(parts[5]!, "base64url");
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || expected.length === 0) {
    return false;
  }

  const actual = await deriveKey(password, salt, expected.length, { N, r, p });
  return timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// JWT primitives — HS256 signed with Node crypto, no external dependencies.
// ---------------------------------------------------------------------------

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

function signHmac(data: string): Buffer {
  return createHmac("sha256", getJwtSecret()).update(data).digest();
}

// ---------------------------------------------------------------------------
// UserStore — the persistence seam.
//
// The AuthService talks to users exclusively through this interface. The
// default implementation is an in-memory store; the Prisma integration pass
// provides a DB-backed implementation of the SAME interface
// (e.g. PrismaUserStore implements UserStore) without touching any callers.
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  /** Normalized (trimmed, lowercased) email — also the uniqueness key. */
  email: string;
  /** Password ALREADY hashed by AuthService (scrypt). Stores never see plain text. */
  passwordHash: string;
  name?: string;
}

export interface UserStore {
  createUser(input: CreateUserInput): Promise<AuthUser>;
  findByEmail(email: string): Promise<StoredUser | null>;
  verifyPassword(user: StoredUser, password: string): Promise<boolean>;
}

function toPublicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    ...(user.name !== undefined ? { name: user.name } : {}),
  };
}

/** Default in-memory UserStore — dev-only, replaced by a DB-backed store in the integration pass. */
export class InMemoryUserStore implements UserStore {
  private readonly usersByEmail = new Map<string, StoredUser>();

  public async createUser(input: CreateUserInput): Promise<AuthUser> {
    if (this.usersByEmail.has(input.email)) {
      throw new AuthError(409, "An account with this email already exists.", "EMAIL_TAKEN");
    }
    const stored: StoredUser = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      ...(input.name !== undefined ? { name: input.name } : {}),
    };
    this.usersByEmail.set(input.email, stored);
    return toPublicUser(stored);
  }

  public async findByEmail(email: string): Promise<StoredUser | null> {
    return this.usersByEmail.get(email) ?? null;
  }

  public async verifyPassword(user: StoredUser, password: string): Promise<boolean> {
    return checkPassword(password, user.passwordHash);
  }
}

// ---------------------------------------------------------------------------
// AuthService — signup / login / JWT signing & verification.
// ---------------------------------------------------------------------------

export class AuthService {
  private readonly store: UserStore;

  constructor(store?: UserStore) {
    this.store = store ?? new InMemoryUserStore();
  }

  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static isValidEmailFormat(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ----- JWT signing / verification (static — no store needed) -----

  /** Signs a token for an existing user with a 24h expiry. */
  public static signToken(user: AuthUser): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    };
    return AuthService.signTokenPayload(payload);
  }

  /**
   * Signs an arbitrary payload (used by tests to craft expired tokens).
   * Returns `header.payload.signature` (base64url, HS256).
   */
  public static signTokenPayload(payload: TokenPayload): string {
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = encodePart(header);
    const encodedPayload = encodePart(payload);
    const signature = signHmac(`${encodedHeader}.${encodedPayload}`);
    return `${encodedHeader}.${encodedPayload}.${signature.toString("base64url")}`;
  }

  /**
   * Verifies signature and expiry of a token.
   * @throws AuthError(401, ...) — INVALID_TOKEN or TOKEN_EXPIRED.
   */
  public static verifyToken(token: string): TokenPayload {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new AuthError(401, "Invalid token.", "INVALID_TOKEN");
    }
    const encodedHeader = parts[0]!;
    const encodedPayload = parts[1]!;
    const providedSignature = parts[2]!;

    // Constant-time signature comparison.
    const expectedSignature = signHmac(`${encodedHeader}.${encodedPayload}`);
    const provided = Buffer.from(providedSignature, "base64url");
    if (
      provided.length !== expectedSignature.length ||
      !timingSafeEqual(provided, expectedSignature)
    ) {
      throw new AuthError(401, "Invalid token.", "INVALID_TOKEN");
    }

    let payload: TokenPayload;
    try {
      payload = decodePart<TokenPayload>(encodedPayload);
    } catch {
      throw new AuthError(401, "Invalid token.", "INVALID_TOKEN");
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number"
    ) {
      throw new AuthError(401, "Invalid token.", "INVALID_TOKEN");
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new AuthError(401, "Token expired.", "TOKEN_EXPIRED");
    }

    return payload;
  }

  // ----- Auth flows -----

  /**
   * Registers a new user.
   * @throws AuthError(400) invalid email / weak password, AuthError(409) duplicate email.
   */
  public async signup(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{ token: string; user: AuthUser }> {
    const email = AuthService.normalizeEmail(input.email);
    if (!AuthService.isValidEmailFormat(email)) {
      throw new AuthError(400, "A valid email address is required.", "INVALID_EMAIL");
    }
    if (typeof input.password !== "string" || input.password.length < 8) {
      throw new AuthError(400, "Password must be at least 8 characters long.", "WEAK_PASSWORD");
    }

    const existing = await this.store.findByEmail(email);
    if (existing) {
      throw new AuthError(409, "An account with this email already exists.", "EMAIL_TAKEN");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.store.createUser({
      email,
      passwordHash,
      ...(input.name !== undefined ? { name: input.name } : {}),
    });
    const token = AuthService.signToken(user);
    return { token, user };
  }

  /**
   * Authenticates a user.
   * @throws AuthError(401) for unknown email, malformed input, or wrong password.
   *         (Single message so we never leak which credential was wrong.)
   */
  public async login(input: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: AuthUser }> {
    const email = AuthService.normalizeEmail(input.email);
    if (
      !AuthService.isValidEmailFormat(email) ||
      typeof input.password !== "string" ||
      input.password.length === 0
    ) {
      throw new AuthError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }

    const stored = await this.store.findByEmail(email);
    if (!stored) {
      throw new AuthError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }

    const passwordOk = await this.store.verifyPassword(stored, input.password);
    if (!passwordOk) {
      throw new AuthError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }

    const user = toPublicUser(stored);
    const token = AuthService.signToken(user);
    return { token, user };
  }
}

/**
 * Default singleton backed by the in-memory store.
 *
 * Prisma integration pass: replace this with a DB-backed store without
 * touching routes or callers, e.g.:
 *   export const authService = new AuthService(new PrismaUserStore(prisma));
 */
export const authService = new AuthService(new InMemoryUserStore());