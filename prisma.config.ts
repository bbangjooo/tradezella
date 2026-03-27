import path from 'node:path'
import { defineConfig } from 'prisma/config'

// When using adapter (Turso), Prisma still requires a datasource URL for validation.
// Use a dummy file URL - the actual connection is handled by the adapter.
export default defineConfig({
  datasource: {
    url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`,
  },
})
