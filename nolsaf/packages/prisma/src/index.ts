// @prisma/client is CommonJS; in an ESM package (`type: "module"`) we must import via default/namespace.
import prismaPkg from '@prisma/client'
const { PrismaClient } = prismaPkg as unknown as { PrismaClient: new () => any }

// Lightweight Prisma client re-export used by the API and other packages.
export const prisma = new PrismaClient()

// Optional default export for compatibility with some imports
export default prisma
