import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

let _prisma: PrismaClient | undefined

function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma

  let url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || ''
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error('Database URL not configured.')
  }

  // Vercel serverless may not support libsql:// protocol - convert to https://
  if (url.startsWith('libsql://')) {
    url = url.replace('libsql://', 'https://')
  }

  const adapter = new PrismaLibSql({ url, authToken })
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
