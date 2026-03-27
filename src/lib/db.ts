import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

let _prisma: PrismaClient | undefined

function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || ''
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error('Database URL not configured.')
  }

  // For local dev with file:// URL, don't use adapter
  if (url.startsWith('file:')) {
    _prisma = new PrismaClient()
    return _prisma
  }

  // For Turso, use libsql adapter
  const libsql = createClient({ url, authToken })
  const adapter = new PrismaLibSQL(libsql)
  _prisma = new PrismaClient({ adapter })
  return _prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
