/**
 * Sanitizes HTML strings using DOMPurify to prevent XSS.
 * Must only be called on the client side (DOMPurify requires a DOM).
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") return "";
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = require("dompurify") as typeof import("dompurify");
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}
