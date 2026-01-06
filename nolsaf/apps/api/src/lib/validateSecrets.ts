/**
 * Security: Environment Variable Validation
 * 
 * This module validates all required secrets at application startup.
 * If any required secret is missing, the application will fail to start.
 * 
 * IMPORTANT: Never log actual secret values, only indicate which keys are missing.
 */

type SecretConfig = {
  key: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
};

const REQUIRED_SECRETS: SecretConfig[] = [
  {
    key: "AZAMPAY_API_KEY",
    required: true,
    description: "AzamPay API key for payment processing",
    validate: (v) => v.length >= 20,
  },
  {
    key: "AZAMPAY_CLIENT_ID",
    required: true,
    description: "AzamPay client ID",
    validate: (v) => v.length >= 5,
  },
  {
    key: "AZAMPAY_CLIENT_SECRET",
    required: true,
    description: "AzamPay client secret",
    validate: (v) => v.length >= 20,
  },
  {
    key: "AZAMPAY_WEBHOOK_SECRET",
    required: true,
    description: "AzamPay webhook signature secret",
    validate: (v) => v.length >= 20,
  },
  {
    key: "DATABASE_URL",
    required: true,
    description: "Database connection string",
    validate: (v) => v.startsWith("mysql://") || v.startsWith("postgresql://"),
  },
  {
    key: "JWT_SECRET",
    required: true,
    description: "JWT signing secret",
    validate: (v) => v.length >= 32,
  },
];

const OPTIONAL_SECRETS: SecretConfig[] = [
  // Email providers
  {
    key: "RESEND_API_KEY",
    required: false,
    description: "Resend API key for transactional emails (recommended)",
  },
  {
    key: "RESEND_FROM_DOMAIN",
    required: false,
    description: "Resend verified domain (e.g., onboarding@resend.dev or no-reply@yourdomain.com)",
  },
  {
    key: "SMTP_HOST",
    required: false,
    description: "SMTP server host (fallback if Resend not configured)",
  },
  {
    key: "SMTP_PORT",
    required: false,
    description: "SMTP server port (default: 587)",
  },
  {
    key: "SMTP_USER",
    required: false,
    description: "SMTP username",
  },
  {
    key: "SMTP_PASS",
    required: false,
    description: "SMTP password",
  },
  {
    key: "EMAIL_FROM",
    required: false,
    description: "Default sender email address",
  },
  // SMS providers
  {
    key: "SMS_PROVIDER",
    required: false,
    description: "SMS provider: 'africastalking' (recommended), 'twilio', or 'console'",
  },
  {
    key: "AFRICASTALKING_USERNAME",
    required: false,
    description: "Africa's Talking username (for Tanzania/East Africa)",
  },
  {
    key: "AFRICASTALKING_API_KEY",
    required: false,
    description: "Africa's Talking API key",
  },
  {
    key: "AFRICASTALKING_SENDER_ID",
    required: false,
    description: "Africa's Talking sender ID (default: 'NoLSAF')",
  },
  {
    key: "TWILIO_ACCOUNT_SID",
    required: false,
    description: "Twilio account SID (alternative SMS provider)",
  },
  {
    key: "TWILIO_AUTH_TOKEN",
    required: false,
    description: "Twilio auth token",
  },
  {
    key: "TWILIO_PHONE_NUMBER",
    required: false,
    description: "Twilio phone number",
  },
  {
    key: "SMS_API_KEY",
    required: false,
    description: "Generic SMS API key (for custom providers)",
  },
  {
    key: "SMS_API_URL",
    required: false,
    description: "Generic SMS API endpoint URL",
  },
  // AWS
  {
    key: "AWS_ACCESS_KEY_ID",
    required: false,
    description: "AWS access key for S3",
  },
  {
    key: "AWS_SECRET_ACCESS_KEY",
    required: false,
    description: "AWS secret key for S3",
  },
];

/**
 * Validates all required environment variables
 * Throws an error if any required secret is missing or invalid
 */
export function validateSecrets(): void {
  const missing: string[] = [];
  const invalid: Array<{ key: string; reason: string }> = [];

  // Check required secrets
  for (const config of REQUIRED_SECRETS) {
    const value = process.env[config.key];
    
    if (!value || value.trim() === "") {
      missing.push(config.key);
      continue;
    }

    // Run custom validation if provided
    if (config.validate && !config.validate(value)) {
      invalid.push({
        key: config.key,
        reason: `Invalid format or too short`,
      });
    }
  }

  // Check optional secrets (warn if missing but don't fail)
  const missingOptional: string[] = [];
  for (const config of OPTIONAL_SECRETS) {
    const value = process.env[config.key];
    if (!value || value.trim() === "") {
      missingOptional.push(config.key);
    }
  }

  // Report errors
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\n` +
      `Please ensure all required secrets are set in your apps/api/.env file.`
    );
  }

  if (invalid.length > 0) {
    throw new Error(
      `Invalid environment variables:\n${invalid.map((i) => `  - ${i.key}: ${i.reason}`).join("\n")}\n\n` +
      `Please check your apps/api/.env file and ensure all secrets are properly formatted.`
    );
  }

  // Warn about missing optional secrets (non-fatal)
  if (missingOptional.length > 0 && process.env.NODE_ENV !== "test") {
    console.warn(
      `⚠️  Warning: Optional environment variables not set:\n${missingOptional.map((k) => `  - ${k}`).join("\n")}`
    );
  }

  // Security check: Ensure we're not in a compromised state
  if (process.env.NODE_ENV === "production") {
    // In production, double-check critical secrets
    const criticalSecrets = [
      "AZAMPAY_WEBHOOK_SECRET",
      "JWT_SECRET",
      "DATABASE_URL",
    ];

    for (const key of criticalSecrets) {
      const value = process.env[key];
      if (value && (value.includes("example") || value.includes("placeholder") || value === "changeme")) {
        throw new Error(
          `Security Error: ${key} appears to be a placeholder value. ` +
          `This is not allowed in production. Please set a real secret.`
        );
      }
    }
  }

  console.log("✅ All required secrets validated successfully");
}

/**
 * Gets a secret value with validation
 * Use this instead of direct process.env access for critical secrets
 */
export function getSecret(key: string, required = true): string {
  const value = process.env[key];
  
  if (required && (!value || value.trim() === "")) {
    throw new Error(`Required secret ${key} is not set`);
  }
  
  return value || "";
}

/**
 * Checks if we're in a secure environment
 */
export function isSecureEnvironment(): boolean {
  // Don't allow production-like operations in development without explicit flag
  if (process.env.NODE_ENV === "development" && !process.env.ALLOW_DEV_PAYMENTS) {
    return false;
  }
  
  return process.env.NODE_ENV === "production";
}

