import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createTursoHttpClient } from './turso-http-client'

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

  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  const client = createTursoHttpClient(rawUrl, authToken)
  const adapter = new PrismaLibSQL(client as any)
  _prisma = new PrismaClient({ adapter })
  return _prisma
}

// Lazy proxy - only creates PrismaClient when first property is accessed at runtime
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    const client = getPrismaClient()
    return (client as any)[prop]
  },
})
