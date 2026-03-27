import { NextResponse } from 'next/server';

export async function GET() {
  const rawUrl = process.env.TURSO_DATABASE_URL || '';
  const httpsUrl = rawUrl.replace('libsql://', 'https://');
  const authToken = process.env.TURSO_AUTH_TOKEN || '';

  const results: Record<string, string> = {};

  // Test with @libsql/client/http
  try {
    const { createClient } = await import('@libsql/client/http');
    const client = createClient({ url: httpsUrl, authToken });
    const res = await client.execute('SELECT 1 as test');
    results['http-https'] = `OK: ${JSON.stringify(res.rows[0])}`;
  } catch (e) {
    results['http-https'] = `ERR: ${(e as Error).message}`;
  }

  // Test with @libsql/client (default)
  try {
    const { createClient } = await import('@libsql/client');
    const client = createClient({ url: rawUrl, authToken });
    const res = await client.execute('SELECT 1 as test');
    results['default-libsql'] = `OK: ${JSON.stringify(res.rows[0])}`;
  } catch (e) {
    results['default-libsql'] = `ERR: ${(e as Error).message}`;
  }

  return NextResponse.json({ results });
}
