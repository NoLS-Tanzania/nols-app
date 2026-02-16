#!/usr/bin/env node
/**
 * Generate a secure 32-byte (256-bit) encryption key for AES-256-GCM
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 * 
 * Output:
 *   A base64-encoded 32-byte key that can be used as ENCRYPTION_KEY environment variable
 * 
 * Security Notes:
 *   - Store this key securely (AWS Secrets Manager, Azure Key Vault, etc.)
 *   - Never commit this key to version control
 *   - Use different keys for development, staging, and production
 *   - Rotate keys periodically
 */

import crypto from 'crypto';

const key = crypto.randomBytes(32);
const keyBase64 = key.toString('base64');
const keyHex = key.toString('hex');

console.log('\n🔐 Encryption Key Generated\n');
console.log('Base64 (recommended for ENCRYPTION_KEY):');
console.log(keyBase64);
console.log('\nHex format:');
console.log(keyHex);
console.log('\n📝 Add to your .env file:');
console.log(`ENCRYPTION_KEY=${keyBase64}`);
console.log('\n⚠️  IMPORTANT: Keep this key secure and never commit it to version control!\n');
