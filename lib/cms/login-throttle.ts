// Five failed logins for the same account inside fifteen minutes locks that account out of
// the local runtime until the oldest failure ages out. A sliding window, not a counter, so
// an attacker cannot park one attempt per day under a reset-on-timer lockout.
export const MAX_FAILURES = 5;
export const FAILURE_WINDOW_MS = 15 * 60 * 1000;

export function createLoginThrottle() {
  const failures = new Map<string, number[]>();

  const recent = (key: string, now: number) =>
    (failures.get(key) ?? []).filter((at) => now - at < FAILURE_WINDOW_MS);

  return {
    isBlocked(key: string, now: number): boolean {
      return recent(key, now).length >= MAX_FAILURES;
    },
    recordFailure(key: string, now: number): void {
      const list = recent(key, now);
      list.push(now);
      failures.set(key, list);
    },
    // A successful login clears the window: the person has proven who they are.
    clear(key: string): void {
      failures.delete(key);
    },
    // Tests and a runtime restart start from a clean window.
    reset(): void {
      failures.clear();
    },
    remaining(key: string, now: number): number {
      return Math.max(0, MAX_FAILURES - recent(key, now).length);
    },
  };
}
