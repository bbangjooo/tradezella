import { NextResponse } from 'next/server';

export async function GET() {
  const url = (process.env.TURSO_DATABASE_URL || '').replace('libsql://', 'https://');
  const authToken = process.env.TURSO_AUTH_TOKEN || '';

  const results: Record<string, string> = {};

  // Test with @libsql/client/web
  try {
    const { createClient } = await import('@libsql/client/web');
    const client = createClient({ url, authToken });
    const res = await client.execute('SELECT 1 as test');
    results['web-https'] = `OK: ${JSON.stringify(res.rows[0])}`;
  } catch (e) {
    results['web-https'] = `ERR: ${(e as Error).message}`;
  }

  // Test with raw fetch
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ statements: [{ q: 'SELECT 1 as test' }] }),
    });
    results['raw-fetch'] = `${res.status}: ${(await res.text()).slice(0, 100)}`;
  } catch (e) {
    results['raw-fetch'] = `ERR: ${(e as Error).message}`;
  }

  return NextResponse.json({ url: url.slice(0, 40), results });
}
