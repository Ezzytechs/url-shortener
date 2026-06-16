import { prisma } from "../config/db.js";
import { generateSlug } from "../utils/nanoid.js";
import { CreateLinkInput } from "../dtos/link.dto.js";

type LinkWithCount = {
  id: string;
  slug: string;
  targetUrl: string;
  expiresAt: Date | null;
  createdAt: Date;
  _count: { clicks: number };
};

export class LinkService {
  async createLink(data: CreateLinkInput) {
    let slug = data.slug || generateSlug();

    // If user provided a slug, check if it's already taken
    if (data.slug) {
      const existing = await prisma.link.findUnique({ where: { slug } });
      if (existing) {
        throw new Error("SLUG_TAKEN");
      }
    } else {
      // If auto-generated, handle rare collision edge cases safely
      let attempts = 0;
      while (attempts < 5) {
        const existing = await prisma.link.findUnique({ where: { slug } });
        if (!existing) break;
        slug = generateSlug();
        attempts++;
      }
    }

    return await prisma.link.create({
      data: {
        slug,
        targetUrl: data.targetUrl,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async getLinkAndLogClick(slug: string, userAgent: string | undefined) {
    try {
      const link = await prisma.link.findUnique({ where: { slug } });

      if (!link) return null;

      // Check expiration constraint
      if (link.expiresAt && new Date() > link.expiresAt) {
        return { expired: true };
      }

      // Capture click analytics (best-effort; failures shouldn't block redirect)
      try {
        await prisma.clickAnalytic.create({
          data: {
            linkId: link.id,
            userAgent,
          },
        });
      } catch (e) {
        // Log analytic write failures but do not surface as a fatal error
        console.error("Click analytic write failed:", e);
      }

      return { expired: false, targetUrl: link.targetUrl };
    } catch (e) {
      // In case of DB connectivity or other unexpected errors, treat as not found
      console.error("getLinkAndLogClick error:", e);
      return null;
    }
  }

  async getAllLinks() {
    const links = await prisma.link.findMany({
      include: {
        _count: {
          select: { clicks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return links.map((link: LinkWithCount) => ({
      id: link.id,
      slug: link.slug,
      targetUrl: link.targetUrl,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      clicksCount: link._count.clicks,
    }));
  }

  async deleteLink(slug: string) {
    try {
      const existing = await prisma.link.findUnique({ where: { slug } });
      if (!existing) return false;

      await prisma.link.delete({ where: { slug } });
      return true;
    } catch (e) {
      console.error("deleteLink error:", e);
      // On DB errors, return false to let controller return 404 semantics
      return false;
    }
  }
}
