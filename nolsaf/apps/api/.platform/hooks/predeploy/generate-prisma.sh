#!/bin/bash
set -e
cd /var/app/staging
echo "[predeploy] Running prisma generate..."
./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma
echo "[predeploy] prisma generate done."
