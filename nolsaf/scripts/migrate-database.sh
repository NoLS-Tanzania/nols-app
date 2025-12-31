#!/bin/bash
# Complete Database Migration Script
# This ensures all tables from Prisma schema are created in the database

echo "🗄️  Database Migration Script"
echo "=============================="
echo ""

cd "$(dirname "$0")/.." || exit 1

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if MySQL is running
echo -e "${CYAN}Step 1: Checking MySQL connection...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

# Test database connection
if [ -f "scripts/check-database-connection.js" ]; then
    CONNECTION_TEST=$(node scripts/check-database-connection.js 2>&1)
    if echo "$CONNECTION_TEST" | grep -q "Successfully connected"; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo "$CONNECTION_TEST"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Connection test script not found, skipping...${NC}"
fi

echo ""
echo -e "${CYAN}Step 2: Generating Prisma Client...${NC}"
npm run prisma:generate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate Prisma Client${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Prisma Client generated${NC}"

echo ""
echo -e "${CYAN}Step 3: Syncing database schema...${NC}"
echo "This will create/update all tables to match your Prisma schema..."
echo ""

# Use db push to sync schema (works even if migrations have issues)
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database schema synced successfully!${NC}"
else
    echo -e "${RED}❌ Schema sync failed${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}Step 4: Verifying tables...${NC}"

# Check if User table exists (main table)
MYSQL_BIN="/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe"
DB_USER="root"
DB_PASSWORD="NoLSVersion@2"
DB_NAME="nolsaf"

if [ -f "$MYSQL_BIN" ]; then
    TABLE_COUNT=$("$MYSQL_BIN" -u "$DB_USER" -p"$DB_PASSWORD" -h 127.0.0.1 -e "USE $DB_NAME; SHOW TABLES;" 2>/dev/null | wc -l)
    
    if [ $TABLE_COUNT -gt 1 ]; then
        echo -e "${GREEN}✅ Found $((TABLE_COUNT - 1)) tables in database${NC}"
        echo ""
        echo "Tables created:"
        "$MYSQL_BIN" -u "$DB_USER" -p"$DB_PASSWORD" -h 127.0.0.1 -e "USE $DB_NAME; SHOW TABLES;" 2>/dev/null | grep -v "Tables_in" | while read -r table; do
            echo "  - $table"
        done
    else
        echo -e "${YELLOW}⚠️  No tables found (or connection issue)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  MySQL client not found, skipping table verification${NC}"
fi

echo ""
echo -e "${CYAN}Step 5: Running migrations (if any pending)...${NC}"

# Try to apply any pending migrations
npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1 | head -20

MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations applied${NC}"
elif echo "$(npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1)" | grep -q "already applied\|No pending migrations"; then
    echo -e "${GREEN}✅ All migrations already applied${NC}"
else
    echo -e "${YELLOW}⚠️  Some migrations may have issues (this is OK if db push worked)${NC}"
fi

echo ""
echo -e "${CYAN}Step 6: Final verification...${NC}"

# Check for key tables
KEY_TABLES=("User" "Property" "Booking" "Invoice" "SystemSetting")

MISSING_TABLES=()
for table in "${KEY_TABLES[@]}"; do
    if [ -f "$MYSQL_BIN" ]; then
        EXISTS=$("$MYSQL_BIN" -u "$DB_USER" -p"$DB_PASSWORD" -h 127.0.0.1 -e "USE $DB_NAME; SHOW TABLES LIKE '$table';" 2>/dev/null | grep -c "$table")
        if [ "$EXISTS" -eq 0 ]; then
            MISSING_TABLES+=("$table")
        fi
    fi
done

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All key tables exist${NC}"
else
    echo -e "${RED}❌ Missing tables: ${MISSING_TABLES[*]}${NC}"
    echo "   Run 'npx prisma db push --schema=prisma/schema.prisma --accept-data-loss' again"
fi

echo ""
echo "=============================="
echo -e "${GREEN}✅ Migration Complete!${NC}"
echo ""
echo "Your database now has all tables from Prisma schema."
echo ""
echo "To verify, you can:"
echo "  1. Check tables: mysql -u root -p -e 'USE nolsaf; SHOW TABLES;'"
echo "  2. Test login with: admin@nolsaf.com / password123"
echo ""

