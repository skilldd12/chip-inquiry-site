export function rateLimit(
  key: string,
  limit?: number,
  windowMs?: number
): { allowed: boolean; remaining: number; retryAfter: number };
export function clientIp(request: Request): string;
