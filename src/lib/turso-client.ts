// Lightweight Turso HTTP client that works in any serverless environment
// Uses the Turso HTTP API directly via fetch - no native dependencies needed

interface TursoConfig {
  url: string;
  authToken: string;
}

interface TursoResult {
  columns: string[];
  rows: any[][];
  rows_read: number;
  rows_written: number;
}

interface TursoResponse {
  results: TursoResult;
}

function getConfig(): TursoConfig {
  const rawUrl = process.env.TURSO_DATABASE_URL || '';
  const url = rawUrl.replace('libsql://', 'https://');
  const authToken = process.env.TURSO_AUTH_TOKEN || '';
  return { url, authToken };
}

export async function tursoExecute(sql: string, args?: any[]): Promise<{ columns: string[]; rows: any[][] }> {
  const { url, authToken } = getConfig();

  const body: any = {
    statements: [
      args && args.length > 0
        ? { q: sql, params: args.map(a => ({ type: typeof a === 'number' ? 'integer' : 'text', value: String(a) })) }
        : { q: sql }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP error ${res.status}: ${text}`);
  }

  const data: TursoResponse[] = await res.json();
  return data[0]?.results ?? { columns: [], rows: [] };
}
