/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and escapes special characters
 */

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');
  
  // Escape HTML entities
  return withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize text content (preserves line breaks as \n)
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');
  
  // Escape HTML entities but preserve newlines
  return withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Alias for sanitizeHtml for backward compatibility
 */
export const cleanHtml = sanitizeHtml;
