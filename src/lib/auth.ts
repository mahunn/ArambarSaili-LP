import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "henley_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (fallback) return fallback;
  return "";
}

function sign(raw: string): string {
  const secret = getEnv("SESSION_SECRET", "dev_only_session_secret_change_in_production");
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

function createSessionToken(adminId: string): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_MS;
  const payload = `${adminId}:${issuedAt}:${expiresAt}`;
  return `${payload}:${sign(payload)}`;
}

function parseAndVerifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 4) return false;

  const [adminId, issuedAt, expiresAt, sig] = parts;
  const payload = `${adminId}:${issuedAt}:${expiresAt}`;
  const expectedSig = sign(payload);

  if (sig !== expectedSig) return false;
  if (Number.isNaN(Number(expiresAt))) return false;
  return Date.now() <= Number(expiresAt);
}

export async function authenticate(adminId: string, password: string): Promise<boolean> {
  const expectedAdminId = getEnv("ADMIN_ID", "admin");
  const expectedPassword = getEnv("ADMIN_PASSWORD", "admin123");

  if (adminId !== expectedAdminId || password !== expectedPassword) {
    return false;
  }

  const token = createSessionToken(adminId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000
  });
  return true;
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return parseAndVerifyToken(token);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
