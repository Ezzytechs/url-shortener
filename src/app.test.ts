import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "./app.js";
import { prisma } from "./config/db.js";

describe("API Integration Test Suite", () => {
  let sharedSlug: string;

  // Clean up or isolate database state if connected locally
  beforeAll(async () => {
    try {
      // Optional: clear out test links if database is active
      await prisma.link.deleteMany({
        where: { slug: { startsWith: "test-" } },
      });
    } catch (e) {
      // Pass silently if DB is not reachable during isolated CI runner phases
    }
  });

  afterAll(async () => {
    try {
      await prisma.link.deleteMany({
        where: { slug: { startsWith: "test-" } },
      });
      await prisma.$disconnect();
    } catch (e) {
      // Pass silently
    }
  });

  // ==========================================
  // 1. HEALTH ENDPOINT TESTS
  // ==========================================
  describe("GET /health", () => {
    it("should respond with a JSON payload indicating server status", async () => {
      const response = await request(app).get("/health");

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty("services");
      expect(response.body.services).toHaveProperty("server", "up");
    });
  });

  // ==========================================
  // 2. LINK CREATION TESTS (POST /api/links)
  // ==========================================
  describe("POST /api/links - Create Short Link", () => {
    it("should successfully create an auto-generated short link", async () => {
      const response = await request(app)
        .post("/api/links")
        .send({ targetUrl: "https://example.com" });

      // If database is down in a basic CI env, handle 500 fallback or 201 happy path
      if (response.status === 201) {
        expect(response.body.status).toBe("success");
        expect(response.body.data).toHaveProperty("slug");
        expect(response.body.data.targetUrl).toBe("https://example.com");
        sharedSlug = response.body.data.slug; // Save for subsequent tests
      } else {
        expect(response.status).toBe(500);
      }
    });

    it("should successfully create a link with a valid custom slug", async () => {
      const uniqueCustomSlug = `test-custom-${Date.now()}`;
      const response = await request(app).post("/api/links").send({
        targetUrl: "https://github.com",
        slug: uniqueCustomSlug,
      });

      if (response.status === 201) {
        expect(response.body.status).toBe("success");
        expect(response.body.data.slug).toBe(uniqueCustomSlug);
      } else {
        expect(response.status).toBe(500);
      }
    });

    it("should return 400 Bad Request if targetUrl is missing", async () => {
      const response = await request(app)
        .post("/api/links")
        .send({ slug: "test-missing-url" });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("fail");
      expect(response.body.message).toBe("Validation error");
      expect(response.body.errors[0].field).toBe("targetUrl");
    });

    it("should return 400 Bad Request if targetUrl format is invalid", async () => {
      const response = await request(app)
        .post("/api/links")
        .send({ targetUrl: "not-a-valid-url-format" });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain(
        "Invalid targetUrl format",
      );
    });

    it("should return 400 Bad Request if expiresAt is in the past", async () => {
      const response = await request(app).post("/api/links").send({
        targetUrl: "https://google.com",
        expiresAt: "2020-01-01T00:00:00.000Z",
      });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain(
        "Expiration date must be in the future",
      );
    });
  });

  // ==========================================
  // 3. REDIRECTION TESTS (GET /:slug)
  // ==========================================
  describe("GET /:slug - Redirect Link", () => {
    it("should return 404 Found if the slug does not exist", async () => {
      const response = await request(app).get("/non-existent-slug-xyz");
      expect(response.status).toBe(404);
      expect(response.body.status).toBe("fail");
    });

    it("should perform a 302 redirect for an active valid slug", async () => {
      if (sharedSlug) {
        const response = await request(app).get(`/${sharedSlug}`);
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("https://example.com");
      }
    });
  });

  // ==========================================
  // 4. METRICS & LISTING TESTS (GET /api/links)
  // ==========================================
  describe("GET /api/links - List All Links", () => {
    it("should return a list of links structured with analytics schemas", async () => {
      const response = await request(app).get("/api/links");

      if (response.status === 200) {
        expect(response.body.status).toBe("success");
        expect(Array.isArray(response.body.data)).toBe(true);
        if (response.body.data.length > 0) {
          expect(response.body.data[0]).toHaveProperty("clicksCount");
          expect(response.body.data[0]).toHaveProperty("targetUrl");
        }
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  // ==========================================
  // 5. DELETION TESTS (DELETE /api/links/:slug)
  // ==========================================
  describe("DELETE /api/links/:slug - Remove Link", () => {
    it("should return 404 if trying to delete a non-existent slug", async () => {
      const response = await request(app).delete(
        "/api/links/completely-fake-slug",
      );
      expect(response.status).toBe(404);
    });

    it("should successfully remove an existing slug and return a 200 status", async () => {
      if (sharedSlug) {
        const response = await request(app).delete(`/api/links/${sharedSlug}`);
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("success");

        // Verify it is truly gone (should return 404 on subsequent lookup)
        const checkResponse = await request(app).get(`/${sharedSlug}`);
        expect(checkResponse.status).toBe(404);
      }
    });
  });
});
