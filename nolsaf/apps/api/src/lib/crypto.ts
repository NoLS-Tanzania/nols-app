import argon2 from "argon2";
import crypto from "crypto";

/** Password hashing */
export const hashPassword = (plain: string) => argon2.hash(plain, { type: argon2.argon2id });
export const verifyPassword = async (hash: string, plain: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, plain);
  } catch (error) {
    // Invalid hash format or other verification error
    console.error("Password verification failed:", error);
    return false;
  }
};

/** Backup codes hashing (same as password) */
export const hashCode = (plain: string) => hashPassword(plain);
export const verifyCode = (hash: string, plain: string) => verifyPassword(hash, plain);

/**
 * Production-grade AES-256-GCM encryption for sensitive data (bank accounts, etc.)
 * 
 * Key Requirements:
 * - ENCRYPTION_KEY must be exactly 32 bytes (256 bits) for AES-256
 * - In production, use a secure key management service (AWS KMS, Azure Key Vault, etc.)
 * - Never commit encryption keys to version control
 * - Store keys in environment variables or secret management systems
 * 
 * Format: base64(iv:12bytes + encrypted_data + auth_tag:16bytes)
 * The IV and auth tag are prepended/appended for security and verification
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.ENCRYPTION_KEY;
  
  if (!keyEnv) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required in production. ' +
        'Generate a secure 32-byte key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    }
    // Development fallback (warn but allow)
    console.warn(
      '⚠️  WARNING: Using default encryption key in development. ' +
      'Set ENCRYPTION_KEY environment variable for production!'
    );
    return crypto.createHash('sha256').update('dev-key-dev-key-dev-key-32bytes').digest();
  }
  
  // Support both base64 and hex encoded keys, or raw strings
  let key: Buffer;
  try {
    // Try base64 first
    key = Buffer.from(keyEnv, 'base64');
    if (key.length !== 32) {
      // Try hex
      key = Buffer.from(keyEnv, 'hex');
      if (key.length !== 32) {
        // Use SHA-256 hash of the string to ensure 32 bytes
        key = crypto.createHash('sha256').update(keyEnv).digest();
      }
    }
  } catch {
    // If parsing fails, hash the string
    key = crypto.createHash('sha256').update(keyEnv).digest();
  }
  
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits). Use SHA-256 hash or provide a 32-byte key.');
  }
  
  return key;
}

const ENC_KEY = getEncryptionKey();

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param plaintext - The plain text to encrypt
 * @returns Base64-encoded string containing: IV (12 bytes) + encrypted data + auth tag (16 bytes)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.length === 0) {
    return '';
  }
  
  try {
    // Generate a random 12-byte IV for GCM mode
    const iv = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
    
    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag (16 bytes for GCM)
    const authTag = cipher.getAuthTag();
    
    // Combine: IV (12 bytes) + encrypted data + auth tag (16 bytes)
    const combined = Buffer.concat([iv, encrypted, authTag]);
    
    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param encryptedData - Base64-encoded string from encrypt()
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string, opts?: { log?: boolean }): string {
  if (!encryptedData || encryptedData.length === 0) {
    return '';
  }

  const input = String(encryptedData).trim();

  // If it already looks like a plain number/identifier, don't attempt to decrypt.
  // This prevents producing garbage from accidental base64 decoding of plaintext digits.
  if (/^\+?\d{6,40}$/.test(input)) {
    throw new Error('Value appears to be plaintext, not encrypted');
  }

  const normalizeBase64 = (s: string) => {
    const compact = s.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
      throw new Error('Invalid base64');
    }
    const mod = compact.length % 4;
    if (mod === 1) {
      throw new Error('Invalid base64 length');
    }
    if (mod === 2) return compact + '==';
    if (mod === 3) return compact + '=';
    return compact;
  };

  const isMostlyPrintable = (s: string) => {
    if (!s) return false;
    if (s.includes('\uFFFD')) return false;
    // Allow common printable ASCII + whitespace.
    const printable = s.replace(/[\t\n\r\x20-\x7E]/g, '');
    return printable.length / s.length < 0.05;
  };

  let combined: Buffer;
  try {
    combined = Buffer.from(normalizeBase64(input), 'base64');
  } catch (e) {
    // Not base64 => not encrypted in our system.
    throw new Error('Not encrypted');
  }

  // AES-256-GCM format: IV (12) + ciphertext + authTag (16)
  if (combined.length >= 28) {
    try {
      const iv = combined.slice(0, 12);
      const authTag = combined.slice(-16);
      const encrypted = combined.slice(12, -16);

      const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (error) {
      // Fall back to legacy only if output looks reasonable.
      try {
        const legacy = decryptLegacy(input);
        if (isMostlyPrintable(legacy)) return legacy;
      } catch {
        // ignore
      }
      if (opts?.log !== false) console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data - invalid format or corrupted');
    }
  }

  // Short buffers can't be GCM; try legacy XOR but only if it yields printable text.
  try {
    const legacy = decryptLegacy(input);
    if (isMostlyPrintable(legacy)) return legacy;
  } catch {
    // ignore
  }
  throw new Error('Failed to decrypt sensitive data - invalid format or corrupted');
}

/**
 * Legacy XOR decryption for backward compatibility with old encrypted data
 * @private
 */
function decryptLegacy(b64: string): string {
  const devKey = "dev-key-dev-key-dev-key-32bytes".slice(0, 32);
  const buf = Buffer.from(b64, "base64");
  const key = Buffer.from(devKey);
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ key[i % key.length];
  return out.toString("utf8");
}
