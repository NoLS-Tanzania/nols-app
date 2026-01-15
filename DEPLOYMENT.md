# NoLSAF Deployment Guide

This document provides comprehensive instructions for deploying the NoLSAF application to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Building the Application](#building-the-application)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 20.x or higher
- MySQL 8.0 or higher
- Docker and Docker Compose (for containerized deployment)
- npm or yarn package manager
- Access to production server/environment

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

#### Database
```bash
DATABASE_URL=mysql://user:password@host:3306/nolsaf
```

#### Authentication & Security
```bash
JWT_SECRET=your-32-character-minimum-secret-key
ENCRYPTION_KEY=your-base64-encoded-32-byte-key
SESSION_SECRET=your-session-secret-key
```

#### API Configuration
```bash
NODE_ENV=production
PORT=4000
API_ORIGIN=https://api.yourdomain.com
WEB_ORIGIN=https://yourdomain.com
```

#### Payment Processing (AzamPay)
```bash
AZAMPAY_API_KEY=your-api-key
AZAMPAY_CLIENT_ID=your-client-id
AZAMPAY_CLIENT_SECRET=your-client-secret
AZAMPAY_WEBHOOK_SECRET=your-webhook-secret
```

#### Email Configuration
```bash
# Option 1: Resend (Recommended)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_DOMAIN=yourdomain.com

# Option 2: SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com
```

#### SMS Configuration
```bash
# Option 1: Africa's Talking (Recommended for Tanzania)
SMS_PROVIDER=africastalking
AFRICASTALKING_USERNAME=your-username
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_SENDER_ID=NoLSAF

# Option 2: Twilio
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

#### File Storage
```bash
# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AWS S3 (Alternative)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### Generate Encryption Key

Before deploying, generate an encryption key:

```bash
cd nolsaf/apps/api
npm run generate:encryption-key
```

Add the output to your `.env` file as `ENCRYPTION_KEY`.

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE nolsaf CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Run Migrations

```bash
npm run prisma:migrate
```

Or manually:

```bash
cd nolsaf
npx prisma migrate deploy
```

### 3. Verify Schema

```bash
npx prisma db push --accept-data-loss
```

## Building the Application

### 1. Install Dependencies

```bash
npm ci
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Build Shared Packages

```bash
npm run --workspace=@nolsaf/shared build
npm run --workspace=@nolsaf/prisma build
```

### 4. Build API

```bash
npm run build --workspace=@nolsaf/api
```

### 5. Build Web App

```bash
npm run build --workspace=@nolsaf/web
```

## Docker Deployment

### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      # Add other environment variables
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: ./nolsaf/apps/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_ORIGIN}
    env_file:
      - .env
    restart: unless-stopped
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Start services:

```bash
docker-compose up -d
```

### Using Individual Dockerfiles

#### Build API Image

```bash
docker build -t nolsaf-api:latest -f Dockerfile .
```

#### Build Web Image

```bash
docker build -t nolsaf-web:latest -f nolsaf/apps/web/Dockerfile ./nolsaf/apps/web
```

#### Run Containers

```bash
# API
docker run -d \
  --name nolsaf-api \
  -p 4000:4000 \
  --env-file .env \
  nolsaf-api:latest

# Web
docker run -d \
  --name nolsaf-web \
  -p 3000:3000 \
  --env-file .env \
  -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  nolsaf-web:latest
```

## Manual Deployment

### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt-get install -y mysql-server
```

### 2. Clone Repository

```bash
git clone https://github.com/NoLS-Tanzania/nols-app.git
cd nols-app
```

### 3. Install Dependencies

```bash
npm ci --production
```

### 4. Build Application

Follow the [Building the Application](#building-the-application) steps.

### 5. Run Migrations

```bash
npm run prisma:migrate
```

### 6. Start Services

#### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start API
cd nolsaf/apps/api
pm2 start dist/index.js --name nolsaf-api

# Start Web
cd ../web
pm2 start npm --name nolsaf-web -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Using systemd

Create `/etc/systemd/system/nolsaf-api.service`:

```ini
[Unit]
Description=NoLSAF API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/nols-app/nolsaf/apps/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable nolsaf-api
sudo systemctl start nolsaf-api
```

## Health Checks

The API provides three health check endpoints:

### `/health`
Basic health check - returns 200 if server is running.

```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### `/ready`
Readiness check - verifies database connectivity.

```bash
curl http://localhost:4000/ready
```

Response (ready):
```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": "ok"
  }
}
```

### `/live`
Liveness check - lightweight check for container orchestration.

```bash
curl http://localhost:4000/live
```

Response:
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Monitoring

### Recommended Monitoring Tools

1. **Application Performance Monitoring (APM)**
   - New Relic
   - Datadog
   - Sentry

2. **Logging**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - CloudWatch (AWS)
   - Papertrail

3. **Uptime Monitoring**
   - UptimeRobot
   - Pingdom
   - StatusCake

### Setup Sentry (Error Tracking)

1. Install Sentry:

```bash
npm install @sentry/node @sentry/nextjs
```

2. Configure in API (`apps/api/src/index.ts`):

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

3. Configure in Web (`apps/web/sentry.client.config.ts`):

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## Troubleshooting

### API Won't Start

1. Check environment variables:
```bash
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

2. Check database connection:
```bash
mysql -u user -p -h host nolsaf
```

3. Check logs:
```bash
pm2 logs nolsaf-api
# or
journalctl -u nolsaf-api -f
```

### Web App Build Fails

1. Clear Next.js cache:
```bash
rm -rf apps/web/.next
```

2. Rebuild:
```bash
npm run build --workspace=@nolsaf/web
```

### Database Connection Issues

1. Verify DATABASE_URL format:
```
mysql://user:password@host:3306/database
```

2. Test connection:
```bash
npx prisma db pull
```

### Health Check Fails

1. Check if API is running:
```bash
curl http://localhost:4000/health
```

2. Check database connectivity:
```bash
curl http://localhost:4000/ready
```

3. Review application logs for errors.

## Security Checklist

- [ ] All environment variables are set
- [ ] Encryption key is generated and secure
- [ ] Database credentials are strong
- [ ] HTTPS is enabled (use reverse proxy like Nginx)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are set (Helmet.js)
- [ ] Regular security updates are applied
- [ ] Backups are automated
- [ ] Monitoring and alerting are configured

## Support

For issues or questions:
- GitHub Issues: https://github.com/NoLS-Tanzania/nols-app/issues
- Documentation: See README.md in project root
