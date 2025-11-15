#!/usr/bin/env node
/*
  generateAdminReports.js
  - Connects to MySQL using env vars or DATABASE_URL
  - Runs admin stats queries (daily approvals, revenue by type, invoice status, overview)
  - Saves output to a JSON file or inserts into AdminStatsReports table

  Usage examples:
    node generateAdminReports.js --from=2025-10-01 --to=2025-10-31 --region=42 --output=json
    node generateAdminReports.js --output=table --name="monthly-2025-10"

  Required env vars (one of these):
    - MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE [, MYSQL_PORT]
  or
    - DATABASE_URL (mysql://user:pass@host:port/db)

  Install dependency: npm install mysql2
*/

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v === undefined ? true : v;
    }
  }
  return out;
}

function isoForDateStr(s) {
  if (!s) return null;
  // accept YYYY-MM-DD or full ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + 'T00:00:00Z';
  return s;
}

async function getConnection() {
  const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, DATABASE_URL } = process.env;
  if (DATABASE_URL) {
    // mysql://user:pass@host:port/db
    const m = DATABASE_URL.match(/^mysql:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/(.+)$/);
    if (!m) throw new Error('DATABASE_URL is not a valid MySQL URL');
    const [, user, password, host, port, database] = m;
    return mysql.createConnection({ host, user, password, database, port: port ? Number(port) : 3306 });
  }
  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) throw new Error('Missing MySQL connection env variables');
  return mysql.createConnection({ host: MYSQL_HOST, user: MYSQL_USER, password: MYSQL_PASSWORD, database: MYSQL_DATABASE, port: MYSQL_PORT ? Number(MYSQL_PORT) : 3306 });
}

async function ensureReportTable(conn) {
  const sql = `
    CREATE TABLE IF NOT EXISTS AdminStatsReports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200),
      payload JSON,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await conn.execute(sql);
}

async function runQueries(conn, params) {
  const { fromIso, toIso, region } = params;
  const withRegion = region && region !== 'ALL';

  // 1) daily approvals
  const dailySql = `
    SELECT DATE(CONVERT_TZ(createdAt, '+00:00', '+03:00')) AS day, COUNT(*) AS cnt
    FROM \`Property\`
    WHERE status = 'APPROVED' AND createdAt BETWEEN ? AND ?
    ${withRegion ? 'AND regionId = ?' : ''}
    GROUP BY day
    ORDER BY day
  `;
  const dailyParams = withRegion ? [fromIso, toIso, region] : [fromIso, toIso];
  const [dailyRows] = await conn.execute(dailySql, dailyParams);

  // 2) base count
  const baseSql = `SELECT COUNT(*) AS cnt FROM \`Property\` WHERE status = 'APPROVED' AND createdAt < ? ${withRegion ? 'AND regionId = ?' : ''}`;
  const baseParams = withRegion ? [fromIso, region] : [fromIso];
  const [baseRows] = await conn.execute(baseSql, baseParams);

  // 3) revenue by type
  const revenueSql = `
    SELECT COALESCE(p.type,'Other') AS property_type, SUM(i.total) AS revenue
    FROM \`Invoice\` i
    JOIN \`Booking\` b ON b.id = i.bookingId
    JOIN \`Property\` p ON p.id = b.propertyId
    WHERE i.issuedAt BETWEEN ? AND ? AND i.status IN ('APPROVED','PAID')
    ${withRegion ? 'AND p.regionId = ?' : ''}
    GROUP BY property_type
    ORDER BY revenue DESC
  `;
  const revenueParams = withRegion ? [fromIso, toIso, region] : [fromIso, toIso];
  const [revenueRows] = await conn.execute(revenueSql, revenueParams);

  // 4) invoice status counts
  const statusSql = `SELECT i.status, COUNT(*) AS cnt FROM \`Invoice\` i WHERE i.issuedAt BETWEEN ? AND ? GROUP BY i.status`;
  const [statusRows] = await conn.execute(statusSql, [fromIso, toIso]);

  // 5) overview aggregates
  const overviewSql = `SELECT SUM(CASE WHEN i.status IN ('APPROVED','PAID') THEN i.total ELSE 0 END) AS grossAmount, SUM(CASE WHEN i.status = 'PAID' THEN i.commissionAmount ELSE 0 END) AS companyRevenue FROM \`Invoice\` i`;
  const [overviewRows] = await conn.execute(overviewSql);

  const [propertiesCountRows] = await conn.execute("SELECT COUNT(*) AS propertiesCount FROM `Property` WHERE status = 'APPROVED'");
  const [ownersCountRows] = await conn.execute("SELECT COUNT(DISTINCT ownerId) AS ownersCount FROM `Property` WHERE status = 'APPROVED'");

  return {
    dailyApprovals: dailyRows,
    baseCount: baseRows && baseRows[0] ? baseRows[0].cnt : 0,
    revenueByType: revenueRows,
    invoiceStatus: statusRows,
    overview: overviewRows && overviewRows[0] ? overviewRows[0] : {},
    propertiesCount: propertiesCountRows && propertiesCountRows[0] ? propertiesCountRows[0].propertiesCount : 0,
    ownersCount: ownersCountRows && ownersCountRows[0] ? ownersCountRows[0].ownersCount : 0,
  };
}

async function main() {
  const args = parseArgs();
  const now = new Date();

  const outMode = args.output || 'json'; // json|table
  const name = args.name || `admin-stats-${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}`;

  const fromArg = args.from || null;
  const toArg = args.to || null;
  const region = args.region || null;

  // defaults
  const toDate = toArg ? new Date(String(toArg)) : new Date();
  const fromDate = fromArg ? new Date(String(fromArg)) : new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const fromIso = isoForDateStr(fromArg) || fromDate.toISOString();
  const toIso = isoForDateStr(toArg) || toDate.toISOString();

  const conn = await getConnection();
  try {
    if (outMode === 'table') await ensureReportTable(conn);
    const results = await runQueries(conn, { fromIso, toIso, region });

    if (outMode === 'json') {
      const outDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const filename = path.join(outDir, `${name}.json`);
      fs.writeFileSync(filename, JSON.stringify({ meta: { from: fromIso, to: toIso, region }, results }, null, 2));
      console.log('Wrote:', filename);
    } else {
      const payload = JSON.stringify({ meta: { from: fromIso, to: toIso, region }, results });
      const insertSql = 'INSERT INTO AdminStatsReports (name, payload) VALUES (?, ?)';
      await conn.execute(insertSql, [name, payload]);
      console.log('Inserted report row:', name);
    }
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
