/**
 * Per-process sliding window. Adequate for a single-node deployment; a shared
 * store (Redis) is the documented upgrade path when running multiple instances.
 */
const buckets = new Map();

export function rateLimit(key, limit = 6, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.reset - now) / 1000),
    };
  }
  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
}

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  return ip;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets) {
    if (value.reset < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
