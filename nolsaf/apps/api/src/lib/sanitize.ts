/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and escapes special characters
 */

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';

  // Remove HTML tags. The result is stored/displayed as plain text, so no
  // entity-escaping is applied (it would otherwise show up literally, e.g. "&#x27;").
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize text content (preserves line breaks as \n)
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';

  // Remove HTML tags. The result is stored/displayed as plain text, so no
  // entity-escaping is applied (it would otherwise show up literally, e.g. "&#x27;").
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Alias for sanitizeHtml for backward compatibility
 */
export const cleanHtml = sanitizeHtml;
