// apps/api/src/lib/sanitize.ts
import sanitizeHtml from "sanitize-html";

export function cleanHtml(input: string | null | undefined) {
  if (!input) return null;
  return sanitizeHtml(input, {
    allowedTags: [
      "b","i","em","strong","u","br","p","ul","ol","li","a","span"
    ],
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      span: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Drop inline event handlers entirely
    allowVulnerableTags: false,
  });
}

// Ensure this file is treated as a module in all TS settings
export {};
