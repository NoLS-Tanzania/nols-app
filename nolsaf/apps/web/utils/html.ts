import sanitize from "sanitize-html";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value: unknown): string {
  // HTML-escape plus backticks (useful inside template literals)
  return escapeHtml(value).replace(/`/g, "&#96;");
}

const DEFAULT_ALLOWED_TAGS = [
  "div",
  "span",
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "small",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "section",
  "article",
  "header",
  "footer",
  "main",
];

const DEFAULT_ALLOWED_ATTRIBUTES: sanitize.IOptions["allowedAttributes"] = {
  "*": ["class", "id", "title", "aria-label", "aria-hidden", "role"],
  a: ["href", "name", "target", "rel"],
  img: ["src", "srcset", "alt", "width", "height"],
};

export function sanitizeTrustedHtml(dirtyHtml: string): string {
  // For intentionally-rendered HTML (templates / receipts).
  // Strips scripts, inline event handlers, javascript: URLs, etc.
  return sanitize(dirtyHtml || "", {
    allowedTags: DEFAULT_ALLOWED_TAGS,
    allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    nonTextTags: ["script", "style", "textarea", "option", "xmp", "noscript"],
    transformTags: {
      a: sanitize.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
    disallowedTagsMode: "discard",
  });
}
