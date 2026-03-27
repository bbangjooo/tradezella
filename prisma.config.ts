import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.TURSO_DATABASE_URL
      ?? `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`,
  },
})
