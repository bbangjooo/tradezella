import path from 'node:path'
import { defineConfig } from 'prisma/config'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

export default defineConfig({
  datasource: {
    url: tursoUrl
      ? `${tursoUrl}?authToken=${tursoToken}`
      : `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`,
  },
})
