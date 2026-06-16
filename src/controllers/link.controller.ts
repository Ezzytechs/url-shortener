import { Request, Response, NextFunction } from "express";
import { LinkService } from "../services/link.service.js";

const linkService = new LinkService();

export class LinkController {
  static async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const link = await linkService.createLink(req.body);
      res.status(201).json({
        status: "success",
        data: link,
      });
    } catch (error: any) {
      if (error.message === "SLUG_TAKEN") {
        res
          .status(409)
          .json({
            status: "fail",
            message: "The provided custom slug is already in use.",
          });
        return;
      }
      next(error);
    }
  }

  static async redirect(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { slug } = req.params;
      
      if (Array.isArray(slug)) {
        res.status(400).json({
          status: "fail",
          message: "Invalid slug",
        });
        return;
      }
      const userAgent = req.headers["user-agent"];

      const result = await linkService.getLinkAndLogClick(slug, userAgent);

      if (!result || result.expired) {
        res.status(404).json({
          status: "fail",
          message: !result
            ? "Short link URL not found."
            : "This short link URL has expired.",
        });
        return;
      }

      // Explicit 302 Found redirect
      res.redirect(302, result.targetUrl!);
    } catch (error) {
      next(error);
    }
  }

  static async list(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const links = await linkService.getAllLinks();
      res.status(200).json({
        status: "success",
        results: links.length,
        data: links,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { slug } = req.params;
      if (Array.isArray(slug)) {
        res.status(400).json({
          status: "fail",
          message: "Invalid slug",
        });
        return;
      }
      const deleted = await linkService.deleteLink(slug);

      if (!deleted) {
        res
          .status(404)
          .json({ status: "fail", message: "Short link URL not found." });
        return;
      }

      res
        .status(200)
        .json({ status: "success", message: "Link successfully removed." });
    } catch (error) {
      next(error);
    }
  }
}
