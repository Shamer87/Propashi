export class RateLimiter {
  private requestCounts: Map<string, { count: number; timestamp: number }> = new Map();
  private limit: number;
  private windowMs: number;
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }
    public isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(ip);
    if (!record) {
      this.requestCounts.set(ip, { count: 1, timestamp: now });
      return false;
    }
    if (now - record.timestamp > this.windowMs) {
      this.requestCounts.set(ip, { count: 1, timestamp: now });
      return false;
    }
    if (record.count >= this.limit) {
      return true; 
    }
    record.count++;
    return false; 
  }
}