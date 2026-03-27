import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://tradezella-bbangjooo.aws-ap-northeast-1.turso.io';
  const results: Record<string, string> = {};

  // Test 1: Can we create a URL?
  try {
    const u = new URL(url);
    results['new-URL'] = `OK: ${u.host}`;
  } catch (e) {
    results['new-URL'] = `ERR: ${(e as Error).message}`;
  }

  // Test 2: Direct fetch
  try {
    const authToken = process.env.TURSO_AUTH_TOKEN || '';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ statements: [{ q: 'SELECT 1 as test' }] }),
    });
    const data = await res.json();
    results['fetch'] = `OK: ${JSON.stringify(data).slice(0, 80)}`;
  } catch (e) {
    results['fetch'] = `ERR: ${(e as Error).message}`;
  }

  // Test 3: @libsql/client
  try {
    const { createClient } = await import('@libsql/client');
    const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || '' });
    const res = await client.execute('SELECT 1 as test');
    results['libsql'] = `OK: ${JSON.stringify(res.rows)}`;
  } catch (e) {
    results['libsql'] = `ERR: ${(e as Error).message} | stack: ${(e as Error).stack?.split('\n')[1]?.trim()}`;
  }

  return NextResponse.json(results);
}
