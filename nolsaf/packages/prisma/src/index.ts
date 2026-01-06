// @prisma/client is CommonJS; in an ESM package (`type: "module"`) we import via default/namespace.
import prismaPkg from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const { PrismaClient } = prismaPkg as unknown as { PrismaClient: new (config?: any) => any }

let prismaInstance: any

function createMariaDbAdapterFromDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl)
  const database = url.pathname.replace(/^\/+/, '')

  const allowPublicKeyRetrievalParam = url.searchParams.get('allowPublicKeyRetrieval')
  const allowPublicKeyRetrieval =
    allowPublicKeyRetrievalParam === 'true' ||
    allowPublicKeyRetrievalParam === '1' ||
    (!allowPublicKeyRetrievalParam &&
      process.env.NODE_ENV !== 'production' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1'))

  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: database || undefined,
    allowPublicKeyRetrieval,
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
