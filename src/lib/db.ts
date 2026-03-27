import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

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

  // Patch globalThis.URL if @libsql/client fails with "Invalid URL"
  // This happens because Turbopack's bundled URL doesn't support libsql:// or certain https:// formats
  const OriginalURL = globalThis.URL
  try {
    // Temporarily wrap URL to handle the Turso domain
    const httpsUrl = rawUrl.replace('libsql://', 'https://')

    globalThis.URL = class PatchedURL extends OriginalURL {
      constructor(input: string | URL, base?: string | URL) {
        try {
          super(input, base)
        } catch {
          // If URL parsing fails, try with https:// prefix
          const str = String(input)
          if (str.includes('turso.io') && !str.startsWith('http')) {
            super('https://' + str)
          } else {
            throw new TypeError('Invalid URL')
          }
        }
      }
    } as any

    const { createClient } = require('@libsql/client')
    const libsql = createClient({ url: httpsUrl, authToken })
    const adapter = new PrismaLibSQL(libsql)
    _prisma = new PrismaClient({ adapter })
  } finally {
    globalThis.URL = OriginalURL
  }

  return _prisma!
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    const client = getPrismaClient()
    return (client as any)[prop]
  },
})
