import express from "express";
import cors from "cors";
import { LinkController } from "./controllers/link.controller.js";
import { HealthController } from "./controllers/health.controller.js";
import { validateBody } from "./middlewares/validation.middleware.js";
import { rateLimiter } from "./middlewares/rate-limiter.middleware.js"; // <-- Import rate limiter
import { CreateLinkSchema } from "./dtos/link.dto.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", HealthController.check);

// Protected by in-memory sliding window rate limiting
app.post(
  "/api/links",
  rateLimiter,
  validateBody(CreateLinkSchema),
  LinkController.create,
);
app.get("/api/links", LinkController.list);
app.delete("/api/links/:slug", LinkController.delete);

app.get("/:slug", LinkController.redirect);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("💥 Unhandled Exception Triggered:", err);
    res.status(500).json({
      status: "error",
      message: "An unexpected internal structural error occurred.",
    });
  },
);

export default app;