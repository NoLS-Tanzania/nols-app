# Production Encryption Setup - Step by Step

This guide walks you through setting up AES-256-GCM encryption for production deployment.

## Step 1: Generate Production Encryption Key

### Option A: Using npm script (Recommended)
```bash
cd apps/api
npm run generate:encryption-key
```

### Option B: Using Node.js directly
```bash
cd apps/api
node scripts/generate-encryption-key.js
```

**Output Example:**
```
🔐 Encryption Key Generated

Base64 (recommended for ENCRYPTION_KEY):
hscjt6ZP3EOccS8WytAbTTbFWhaulnrZS22l28FJhHk=

📝 Add to your .env file:
ENCRYPTION_KEY=hscjt6ZP3EOccS8WytAbTTbFWhaulnrZS22l28FJhHk=
```

**⚠️ IMPORTANT:** Copy the generated key immediately and store it securely!

---

## Step 2: Set Environment Variable

### For Local Development

Create or update `.env` file in the project root (`d:\nolsapp2.1\nolsaf\.env`):

```bash
# Encryption Key for AES-256-GCM (32 bytes, base64 encoded)
ENCRYPTION_KEY=<paste-your-generated-key-here>
```

**Example:**
```bash
ENCRYPTION_KEY=hscjt6ZP3EOccS8WytAbTTbFWhaulnrZS22l28FJhHk=
```

### For Production Deployment

#### Option 1: Environment Variables (Simple)
Set the environment variable in your deployment platform:

**Docker:**
```bash
docker run -e ENCRYPTION_KEY=<your-key> your-image
```

**Docker Compose:**
```yaml
services:
  api:
    environment:
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
```

**Systemd Service:**
```ini
[Service]
Environment="ENCRYPTION_KEY=<your-key>"
```

#### Option 2: Key Management Service (Recommended for Production)

##### AWS Secrets Manager
```bash
# Store the key
aws secretsmanager create-secret \
  --name nolsaf/production/encryption-key \
  --secret-string "<your-generated-key>"

# Retrieve in your application
ENCRYPTION_KEY=$(aws secretsmanager get-secret-value \
  --secret-id nolsaf/production/encryption-key \
  --query SecretString --output text)
```

##### Azure Key Vault
```bash
# Store the key
az keyvault secret set \
  --vault-name nolsaf-vault \
  --name encryption-key \
  --value "<your-generated-key>"

# Retrieve in your application
ENCRYPTION_KEY=$(az keyvault secret show \
  --vault-name nolsaf-vault \
  --name encryption-key \
  --query value -o tsv)
```

##### Google Cloud Secret Manager
```bash
# Store the key
echo -n "<your-generated-key>" | gcloud secrets create encryption-key \
  --data-file=- \
  --replication-policy="automatic"

# Retrieve in your application
ENCRYPTION_KEY=$(gcloud secrets versions access latest \
  --secret="encryption-key")
```

##### HashiCorp Vault
```bash
# Store the key
vault kv put secret/nolsaf/encryption-key value="<your-generated-key>"

# Retrieve in your application
ENCRYPTION_KEY=$(vault kv get -field=value secret/nolsaf/encryption-key)
```

---

## Step 3: Store Key Securely

### ✅ DO:
- ✅ Store keys in a secure key management service (AWS KMS, Azure Key Vault, etc.)
- ✅ Use different keys for development, staging, and production
- ✅ Restrict access to keys (only application servers need read access)
- ✅ Enable audit logging for key access
- ✅ Have a backup/recovery plan for keys
- ✅ Rotate keys periodically (every 6-12 months)

### ❌ DON'T:
- ❌ Commit keys to version control (Git)
- ❌ Store keys in code or configuration files
- ❌ Share keys via email, Slack, or other insecure channels
- ❌ Use the same key across environments
- ❌ Log or expose keys in application logs
- ❌ Store keys in client-side code

---

## Step 4: Verify Setup

### Test Encryption/Decryption

1. **Start your API server:**
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Check for warnings:**
   - ✅ Production: Should start without warnings
   - ⚠️ Development: May show warning if using default key (acceptable for dev)

3. **Test the encryption:**
   - Save bank account information through the owner profile page
   - Check database - account numbers should be encrypted (base64 strings)
   - Verify data can be decrypted when retrieved

### Verify Database Storage

Encrypted data in the database should look like:
```json
{
  "bankAccountNumber": "aGVsbG8gd29ybGQ...",  // Base64 encoded (encrypted)
  "mobileMoneyNumber": "YW5vdGhlciBzdHJpbmc...",  // Base64 encoded (encrypted)
  "bankName": "NMB BANK",  // Plain text (not sensitive)
  "bankAccountName": "John Doe"  // Plain text (not sensitive)
}
```

---

## Step 5: Environment-Specific Keys

### Generate Separate Keys for Each Environment

```bash
# Development key
cd apps/api
npm run generate:encryption-key
# Save as: ENCRYPTION_KEY_DEV

# Staging key
npm run generate:encryption-key
# Save as: ENCRYPTION_KEY_STAGING

# Production key
npm run generate:encryption-key
# Save as: ENCRYPTION_KEY_PRODUCTION
```

### Deployment Configuration

**Development:**
```bash
ENCRYPTION_KEY=<dev-key>
```

**Staging:**
```bash
ENCRYPTION_KEY=<staging-key>
```

**Production:**
```bash
ENCRYPTION_KEY=<production-key>
```

---

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is required in production"

**Solution:** Set the `ENCRYPTION_KEY` environment variable before starting the application.

### Error: "Failed to decrypt sensitive data"

**Possible causes:**
1. Using wrong encryption key (different environment)
2. Data was encrypted with old XOR method (should auto-detect)
3. Corrupted encrypted data

**Solution:**
- Verify you're using the correct key for the environment
- Check if data needs to be re-encrypted
- Verify database integrity

### Warning: "Using default encryption key in development"

**This is normal for development** but ensure:
- Never use default key in production
- Set `ENCRYPTION_KEY` for production deployments

---

## Security Checklist

Before going to production, verify:

- [ ] Production encryption key generated
- [ ] Key stored in secure key management service
- [ ] Key NOT committed to version control
- [ ] Different keys for dev/staging/production
- [ ] Environment variable set in deployment
- [ ] Application starts without encryption warnings
- [ ] Tested encryption/decryption of sensitive data
- [ ] Database shows encrypted values for account numbers
- [ ] Audit logging enabled for key access
- [ ] Key rotation plan documented
- [ ] Backup/recovery plan for keys

---

## Next Steps After Setup

1. **Monitor encryption operations** - Check logs for any decryption failures
2. **Set up key rotation schedule** - Plan to rotate keys every 6-12 months
3. **Document key recovery process** - Ensure team knows how to recover keys
4. **Test disaster recovery** - Verify you can decrypt data with backup keys
5. **Review access controls** - Ensure only authorized services can access keys

---

## Support

For issues or questions:
- Check `apps/api/ENCRYPTION_SETUP.md` for detailed technical documentation
- Review application logs for encryption-related errors
- Verify environment variables are properly set
