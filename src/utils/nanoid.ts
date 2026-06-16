import { randomBytes } from "crypto";

/**
 * Generates a URL-safe secure random string of a specified length.
 */
export function generateSlug(length: number = 6): string {
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }

  return result;
}
