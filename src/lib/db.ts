import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

let _prisma: PrismaClient | undefined

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

  // Always use https:// for HTTP transport (works in all serverless environments)
  const url = rawUrl.replace('libsql://', 'https://')
  const authToken = process.env.TURSO_AUTH_TOKEN || ''

  const libsql = createClient({ url, authToken })
  const adapter = new PrismaLibSQL(libsql)
  _prisma = new PrismaClient({ adapter })
  return _prisma
}

// Lazy proxy - only creates PrismaClient when first property is accessed at runtime
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    return value
  },
})
