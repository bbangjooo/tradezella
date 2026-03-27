import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

let _prisma: PrismaClient | undefined

function createTursoClient(): Client {
  const rawUrl = process.env.TURSO_DATABASE_URL || ''
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  // Always use https:// for HTTP transport (works in all environments)
  const url = rawUrl.replace('libsql://', 'https://')
  return createClient({ url, authToken })
}

function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma

  const rawUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || ''

  if (!rawUrl) {
    throw new Error('Database URL not configured.')
  }

  if (rawUrl.startsWith('file:')) {
    _prisma = new PrismaClient()
    return _prisma
  }

  const libsql = createTursoClient()
  const adapter = new PrismaLibSQL(libsql)
  _prisma = new PrismaClient({ adapter })
  return _prisma
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? getPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
