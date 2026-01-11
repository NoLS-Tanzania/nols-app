// Backfill Booking.userId based on guestPhone matching User.phone
// Usage:
//   node scripts/backfill-booking-user-links.js
//   node scripts/backfill-booking-user-links.js --dry-run
//
// Notes:
// - Safe to re-run (only updates rows where Booking.userId IS NULL)
// - Uses dynamic import so it runs in this repo (root is CommonJS)

require('dotenv/config')

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const prismaMod = await import('@nolsaf/prisma')
  const prisma = prismaMod.default ?? prismaMod.prisma
  if (!prisma) throw new Error('Failed to load Prisma client from @nolsaf/prisma')

  const candidateCount = await prisma.booking.count({
    where: {
      userId: null,
      guestPhone: { not: null },
    },
  })

  console.log(`[backfill] Candidate bookings (userId IS NULL, guestPhone NOT NULL): ${candidateCount}`)

  // Normalized match update (fast path, single SQL)
  // - removes spaces and leading '+'
  // - also matches 0XXXXXXXXX <-> 255XXXXXXXXX (Tanzania-style)
  const sql = `
    UPDATE Booking b
    JOIN User u ON u.phone IS NOT NULL
    SET b.userId = u.id
    WHERE b.userId IS NULL
      AND b.guestPhone IS NOT NULL
      AND (
        REPLACE(REPLACE(b.guestPhone, ' ', ''), '+', '') = REPLACE(REPLACE(u.phone, ' ', ''), '+', '')
        OR (
          REPLACE(REPLACE(b.guestPhone, ' ', ''), '+', '') LIKE '0%'
          AND CONCAT('255', SUBSTRING(REPLACE(REPLACE(b.guestPhone, ' ', ''), '+', ''), 2)) = REPLACE(REPLACE(u.phone, ' ', ''), '+', '')
        )
        OR (
          REPLACE(REPLACE(u.phone, ' ', ''), '+', '') LIKE '0%'
          AND CONCAT('255', SUBSTRING(REPLACE(REPLACE(u.phone, ' ', ''), '+', ''), 2)) = REPLACE(REPLACE(b.guestPhone, ' ', ''), '+', '')
        )
      );
  `

  if (dryRun) {
    console.log('[backfill] Dry-run mode: not applying updates.')
    console.log(sql.trim())
    return
  }

  const updated = await prisma.$executeRawUnsafe(sql)
  console.log(`[backfill] Updated rows (exact phone match): ${updated}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
