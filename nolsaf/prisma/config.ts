/**
 * Prisma 7+ Configuration
 * Connection URL is configured here instead of in schema.prisma
 * See: https://pris.ly/d/config-datasource
 */
export const datasource = {
  provider: 'mysql' as const,
  url: process.env.DATABASE_URL,
}

