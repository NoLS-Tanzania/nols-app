import { PrismaClient } from '@prisma/client'

// Lightweight Prisma client re-export used by the API and other packages.
export const prisma = new PrismaClient()

// Optional default export for compatibility with some imports
export default prisma
