import { z } from "zod";

export const CreateLinkSchema = z.object({
  targetUrl: z.string().min(1, { message: "targetUrl is required" }).url({
    message:
      "Invalid targetUrl format. Must be a valid URL (e.g., https://example.com)",
  }),

  slug: z
    .string()
    .min(3, { message: "Custom slug must be at least 3 characters long" })
    .max(30, { message: "Custom slug cannot exceed 30 characters" })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "Slug can only contain alphanumeric characters, hyphens, and underscores",
    })
    .optional(),

  expiresAt: z
    .string()
    .datetime({ message: "expiresAt must be a valid ISO 8601 string" })
    .refine((val) => new Date(val) > new Date(), {
      message: "Expiration date must be in the future",
    })
    .optional(),
});

export type CreateLinkInput = z.infer<typeof CreateLinkSchema>;
