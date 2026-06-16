import { Request, Response } from "express";
import { prisma } from "../config/db.js";

export class HealthController {
  static async check(req: Request, res: Response): Promise<void> {
    try {
      // Perform a low-overhead network execution ping against PostgreSQL
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          server: "up",
          database: "connected",
        },
      });
    } catch (error: any) {
      console.error("🚨 Health check failed:", error);

      // Return a 503 Service Unavailable if the database layer is down
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          server: "up",
          database: "disconnected",
        },
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}
