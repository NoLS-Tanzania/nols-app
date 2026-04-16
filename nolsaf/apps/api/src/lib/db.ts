// Standalone Prisma client singleton for apps/api.
// This replaces the @nolsaf/prisma workspace package so the app works on
// Elastic Beanstalk where file:../../packages/prisma is not available.
import prismaPkg from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const { PrismaClient } = prismaPkg as unknown as { PrismaClient: new (config?: any) => any };

let prismaInstance: any;

function createMariaDbAdapterFromDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\/+/, '');

  const allowPublicKeyRetrievalParam = url.searchParams.get('allowPublicKeyRetrieval');
  const allowPublicKeyRetrieval =
    allowPublicKeyRetrievalParam !== 'false' &&
    allowPublicKeyRetrievalParam !== '0';

  const sslAccept = url.searchParams.get('sslaccept');
  const ssl = sslAccept
    ? { rejectUnauthorized: sslAccept !== 'accept_invalid_certs' }
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined;

  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: database || undefined,
    allowPublicKeyRetrieval,
    ssl,
    connectTimeout: 10000,
    socketTimeout:  60000,
    connectionLimit: 10,
    idleTimeout:    60000,
  } as any);
}

function getOrCreatePrisma() {
  if (prismaInstance) return prismaInstance;
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }
  const adapter = createMariaDbAdapterFromDatabaseUrl(DATABASE_URL);
  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}

const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getOrCreatePrisma();
      const value = client[prop as keyof typeof client];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  },
) as any;

export { prisma, getOrCreatePrisma };
export default prisma;
