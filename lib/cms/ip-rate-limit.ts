// Per-client sliding-window limiter for the public authentication endpoints. Complements the
// per-account lockout in login-throttle.ts: that one stops guessing ONE account, this one stops one
// client sweeping many accounts or hammering the SSO entry points.
//
// The client key is Cloudflare's `cf-connecting-ip` (set by the tunnel, the only public path to this
// loopback process); without it the socket address is used. `x-forwarded-for` is deliberately NOT
// read: a client can send it, so trusting it would hand every attacker a fresh bucket per request.
export function clientKey(headers: Record<string, string | string[] | undefined>, remoteAddress?: string): string {
  const cf = headers["cf-connecting-ip"];
  const value = Array.isArray(cf) ? cf[0] : cf;
  return (value?.trim() || remoteAddress || "unknown").trim();
}

export function createIpLimiter({ max, windowMs, maxKeys = 5000 }: { max: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, number[]>();
  return {
    /** Records one hit and says whether the client is now over its budget. */
    hit(key: string, now: number): { limited: boolean; retryAfterSeconds: number } {
      const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
      recent.push(now);
      hits.set(key, recent);
      // Bounded table: at the ceiling, forget the oldest keys rather than growing without limit.
      if (hits.size > maxKeys) for (const k of [...hits.keys()].slice(0, hits.size - maxKeys)) hits.delete(k);
      const limited = recent.length > max;
      return { limited, retryAfterSeconds: limited ? Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) : 0 };
    },
    reset(): void {
      hits.clear();
    },
  };
}
