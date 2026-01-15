# Encryption Setup Guide

This application uses **AES-256-GCM** encryption for sensitive data (bank account numbers, mobile money numbers, etc.).

## Quick Start

### 1. Generate Encryption Key

Run the key generation script:

```bash
npm run generate:encryption-key
```

Or manually:

```bash
node scripts/generate-encryption-key.js
```

This will output a secure 32-byte (256-bit) key in base64 format.

### 2. Set Environment Variable

Add the generated key to your `.env` file:

```bash
ENCRYPTION_KEY=<your-generated-key-here>
```

**⚠️ CRITICAL: Never commit the encryption key to version control!**

### 3. Verify Setup

The application will:
- Use the provided key in production
- Warn if no key is set in development
- Fail to start in production if no key is provided

## Production Deployment

### Recommended: Use Key Management Services

For production, store your encryption key in a secure key management service:

#### AWS (AWS Secrets Manager or KMS)
```bash
# Retrieve key from AWS Secrets Manager
ENCRYPTION_KEY=$(aws secretsmanager get-secret-value --secret-id nolsaf/encryption-key --query SecretString --output text)
```

#### Azure (Azure Key Vault)
```bash
# Retrieve key from Azure Key Vault
ENCRYPTION_KEY=$(az keyvault secret show --vault-name nolsaf-vault --name encryption-key --query value -o tsv)
```

#### Google Cloud (Secret Manager)
```bash
# Retrieve key from GCP Secret Manager
ENCRYPTION_KEY=$(gcloud secrets versions access latest --secret="encryption-key")
```

### Environment-Specific Keys

Use **different encryption keys** for:
- Development
- Staging
- Production

This ensures that encrypted data from one environment cannot be decrypted in another.

## Key Rotation

If you need to rotate encryption keys:

1. **Generate a new key** using the script
2. **Re-encrypt existing data** (create a migration script)
3. **Update the environment variable** in your deployment
4. **Test thoroughly** before deploying

⚠️ **Warning**: If you lose the encryption key, encrypted data cannot be recovered!

## Technical Details

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 32 bytes (256 bits)
- **IV Size**: 12 bytes (random, generated per encryption)
- **Auth Tag**: 16 bytes (for integrity verification)
- **Format**: Base64-encoded (IV + encrypted data + auth tag)

The encryption format ensures:
- **Confidentiality**: Data cannot be read without the key
- **Integrity**: Data cannot be tampered with (auth tag verification)
- **Authenticity**: Ensures data came from the expected source

## Backward Compatibility

The implementation includes backward compatibility for data encrypted with the old XOR-based method. Old data will be automatically decrypted using the legacy method when GCM decryption fails.

## Security Best Practices

1. ✅ Use different keys for each environment
2. ✅ Store keys in secure key management services
3. ✅ Never log or expose encryption keys
4. ✅ Rotate keys periodically
5. ✅ Use HTTPS/TLS for all data transmission
6. ✅ Implement proper access controls
7. ✅ Audit encryption key access
8. ✅ Have a key recovery/backup strategy

## Troubleshooting

### "ENCRYPTION_KEY environment variable is required in production"
- Set the `ENCRYPTION_KEY` environment variable before starting the application

### "Failed to decrypt sensitive data"
- Ensure you're using the same encryption key that was used to encrypt the data
- Check if the data was encrypted with a different key or method
- Verify the encrypted data hasn't been corrupted

### Development warnings
- In development, the app will use a default key if none is provided
- This is safe for development but **must not be used in production**
