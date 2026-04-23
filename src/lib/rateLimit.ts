export class RateLimiter {
  private requestCounts: Map<string, { count: number; timestamp: number }> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Check if the given IP has exceeded the limit.
   * Returns true if rate limited (should block), false if allowed.
   */
  public isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(ip);

    if (!record) {
      this.requestCounts.set(ip, { count: 1, timestamp: now });
      return false;
    }

    if (now - record.timestamp > this.windowMs) {
      // Reset window
      this.requestCounts.set(ip, { count: 1, timestamp: now });
      return false;
    }

    if (record.count >= this.limit) {
      return true; // Block
    }

    record.count++;
    return false; // Allow
  }
}
