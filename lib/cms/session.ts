import { createHash, randomBytes } from "node:crypto";

// Sessions are opened at login and carried by a bearer token; only the hash is stored.
// Idle 30 minutes, absolute 8 hours — re-authentication is expected inside a working day,
// and a stolen token stops working half an hour after the last real use.
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;

export type Session = {
  userId: string;
  createdAt: number;
  lastSeenAt: number;
};

export function createSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSessionToken(token) };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function openSession(userId: string, now: number): Session {
  return { userId, createdAt: now, lastSeenAt: now };
}

// Two clocks, both enforced: an absolute cap so a session cannot be kept alive forever by
// steady use, and an idle cap for the copy left open on a shared desk machine.
export function isSessionExpired(session: Session, now: number): boolean {
  return now - session.lastSeenAt >= SESSION_IDLE_MS || now - session.createdAt >= SESSION_ABSOLUTE_MS;
}
