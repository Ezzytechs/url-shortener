import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  timestamps: number[];
}

const ipCache = new Map<string, RateLimitRecord>();

// Configurations: Allow 10 link creations per 1 minute window per IP address
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  if (!ipCache.has(ip)) {
    ipCache.set(ip, { timestamps: [now] });
    return next();
  }

  const record = ipCache.get(ip)!;

  // Filter out timestamps that fall outside the current sliding time window
  record.timestamps = record.timestamps.filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );

  if (record.timestamps.length >= MAX_REQUESTS) {
    res.status(429).json({
      status: "fail",
      message:
        "Too many links created from this IP. Please try again after a minute.",
    });
    return;
  }

  // Record the current successful request timestamp
  record.timestamps.push(now);
  next();
};
