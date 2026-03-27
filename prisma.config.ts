import path from 'node:path'
import { defineConfig } from 'prisma/config'

const tursoUrl = process.env.TURSO_DATABASE_URL

export default defineConfig({
  datasource: {
    url: tursoUrl
      ? tursoUrl.replace('libsql://', 'https://')
      : `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`,
  },
})
