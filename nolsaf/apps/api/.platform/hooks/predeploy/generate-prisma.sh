#!/bin/bash
set -e
cd /var/app/staging
echo "[predeploy] Running prisma generate..."
# prisma is a devDependency of @nolsaf/api so it is always present in node_modules
./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma
echo "[predeploy] prisma generate done."
