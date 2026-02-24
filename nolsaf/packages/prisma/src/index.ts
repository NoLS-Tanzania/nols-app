// @prisma/client is CommonJS; in an ESM package (`type: "module"`) we import via default/namespace.
import prismaPkg from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const { PrismaClient } = prismaPkg as unknown as { PrismaClient: new (config?: any) => any }

let prismaInstance: any

function createMariaDbAdapterFromDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl)
  const database = url.pathname.replace(/^\/+/, '')

  const allowPublicKeyRetrievalParam = url.searchParams.get('allowPublicKeyRetrieval')
  // Default true — Railway (and most remote MySQL 8/MariaDB) require public-key
  // retrieval for caching_sha2_password auth. Only disable if explicitly set to false.
  const allowPublicKeyRetrieval =
    allowPublicKeyRetrievalParam !== 'false' &&
    allowPublicKeyRetrievalParam !== '0'

  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: database || undefined,
    allowPublicKeyRetrieval,
    connectTimeout: 10000,   // 10s — Railway remote host needs more than 1s default
    socketTimeout:  60000,   // 60s — keep long-running queries alive
    connectionLimit: 10,
    idleTimeout:    60000,   // release idle connections after 60s
  } as any)
}

function getOrCreatePrisma() {
  if (prismaInstance) return prismaInstance
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set. Please configure it (e.g. in nolsaf/apps/api/.env).')
  }
  const adapter = createMariaDbAdapterFromDatabaseUrl(DATABASE_URL)
  prismaInstance = new PrismaClient({ adapter })
  return prismaInstance
}

// Preserve the existing API surface (`prisma.user.findFirst(...)`) while delaying
// construction until runtime. This also avoids crashing `npm install` if something
// imports this package before env/deps are ready.
const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getOrCreatePrisma()
      const value = client[prop as keyof typeof client]
      return typeof value === 'function' ? value.bind(client) : value
    },
  },
) as any

export { prisma, getOrCreatePrisma }
export default prisma
