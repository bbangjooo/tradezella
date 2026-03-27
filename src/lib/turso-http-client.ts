// Minimal libsql-compatible Client using raw fetch
// Bypasses @libsql/client's URL parsing which breaks in Turbopack

interface ResultSet {
  columns: string[]
  rows: any[][]
  rowsAffected: number
  lastInsertRowid: bigint | undefined
}

interface Statement {
  sql: string
  args?: any[]
}

export interface TursoClient {
  execute(sql: string | Statement): Promise<ResultSet>
  batch(stmts: Statement[]): Promise<ResultSet[]>
  close(): void
}

export function createTursoHttpClient(url: string, authToken: string): TursoClient {
  const baseUrl = url.replace('libsql://', 'https://')

  async function executeStatements(statements: { q: string; params?: any[] }[]): Promise<any[]> {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ statements }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Turso HTTP ${res.status}: ${text}`)
    }

    return res.json()
  }

  function mapResult(raw: any): ResultSet {
    const results = raw?.results ?? raw ?? { columns: [], rows: [] }
    return {
      columns: results.columns ?? [],
      rows: (results.rows ?? []).map((row: any[]) =>
        row.map(val => {
          if (val === null) return null
          if (typeof val === 'object' && val.type === 'integer') return Number(val.value)
          if (typeof val === 'object' && val.type === 'float') return Number(val.value)
          if (typeof val === 'object' && val.type === 'text') return val.value
          if (typeof val === 'object' && val.type === 'blob') return val.value
          if (typeof val === 'object' && val.type === 'null') return null
          return val
        })
      ),
      rowsAffected: results.rows_written ?? 0,
      lastInsertRowid: undefined,
    }
  }

  return {
    async execute(stmtOrSql: string | Statement): Promise<ResultSet> {
      const sql = typeof stmtOrSql === 'string' ? stmtOrSql : stmtOrSql.sql
      const args = typeof stmtOrSql === 'string' ? undefined : stmtOrSql.args

      const stmt: any = { q: sql }
      if (args && args.length > 0) {
        stmt.params = args
      }

      const data = await executeStatements([stmt])
      return mapResult(data[0])
    },

    async batch(stmts: Statement[]): Promise<ResultSet[]> {
      const mapped = stmts.map(s => ({
        q: s.sql,
        ...(s.args && s.args.length > 0 ? { params: s.args } : {}),
      }))
      const data = await executeStatements(mapped)
      return data.map(mapResult)
    },

    close() {},
  }
}
