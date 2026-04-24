/**
 * Privacy utilities for GDPR compliance
 * Provides IP anonymization and PII handling
 */

/**
 * Anonymize IP address to comply with GDPR
 * - IPv4: Keeps first 3 octets, zeros last octet (e.g., 192.168.1.0)
 * - IPv6: Keeps first 4 groups, zeros rest (e.g., 2001:db8:85a3:8d3::)
 * 
 * @param ip - IP address to anonymize
 * @returns Anonymized IP address or null if invalid
 */
export function anonymizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  
  const trimmed = ip.trim();
  
  // IPv4: Keep first 3 octets, zero last octet
  if (trimmed.includes('.') && !trimmed.includes(':')) {
    const parts = trimmed.split('.');
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  
  // IPv6: Keep first 4 groups, zero rest
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').filter(Boolean);
    if (parts.length >= 4) {
      // Take first 4 groups and append :: for remaining
      return `${parts.slice(0, 4).join(':')}::`;
    }
  }
  
  // Invalid format - don't store
  return null;
}

/**
 * Extract IP from request, handling X-Forwarded-For proxy headers
 * Returns the client IP, not proxy IP
 * 
 * @param req - Express request object
 * @returns Client IP address or null
 */
export function getClientIp(req: any): string | null {
  // X-Forwarded-For header contains comma-separated IPs: client, proxy1, proxy2
  // First IP is the real client IP
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = String(forwardedFor).split(',');
    const clientIp = ips[0]?.trim();
    if (clientIp) return clientIp;
  }
  
  // Fallback to direct connection IP
  return req.socket?.remoteAddress || req.connection?.remoteAddress || null;
}

/**
 * Get anonymized client IP from request
 * Combines IP extraction and anonymization
 * 
 * @param req - Express request object
 * @returns Anonymized client IP or null
 */
export function getAnonymizedClientIp(req: any): string | null {
  const ip = getClientIp(req);
  return anonymizeIp(ip);
}

/**
 * Truncate session ID to prevent full tracking
 * Keeps first 8 characters for analytics, discards rest
 * 
 * @param sessionId - Full session identifier
 * @returns Truncated session ID or null
 */
export function truncateSessionId(sessionId: string | null | undefined): string | null {
  if (!sessionId || typeof sessionId !== 'string') return null;
  
  // Keep only first 8 characters for basic analytics
  return sessionId.trim().slice(0, 8) || null;
}

/**
 * Sanitize user-agent string to remove device fingerprinting data
 * Keeps browser and OS info, removes detailed version strings
 * 
 * @param userAgent - Full user-agent string
 * @returns Sanitized user-agent or null
 */
export function sanitizeUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent || typeof userAgent !== 'string') return null;
  
  const ua = userAgent.trim();
  
  // Extract browser name (Chrome, Firefox, Safari, Edge)
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const browser = browserMatch ? browserMatch[1] : 'Unknown';
  
  // Extract OS (Windows, Mac, Linux, Android, iOS)
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'Mac';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return `${browser}/${os}`;
}

/**
 * Check if data retention period has expired
 * Used for automated cleanup of old records
 * 
 * @param createdAt - Record creation date
 * @param retentionMonths - Retention period in months (default: 3)
 * @returns True if record should be deleted
 */
export function isRetentionExpired(createdAt: Date, retentionMonths: number = 3): boolean {
  const now = new Date();
  const expiryDate = new Date(createdAt);
  expiryDate.setMonth(expiryDate.getMonth() + retentionMonths);
  
  return now >= expiryDate;
}
