import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL || '';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';

  const results: Record<string, string> = {};

  // Try different URL formats
  for (const testUrl of [url, url.replace('libsql://', 'https://'), `https://${url.replace('libsql://', '')}`]) {
    try {
      const client = createClient({ url: testUrl, authToken });
      const res = await client.execute('SELECT 1 as test');
      results[testUrl.slice(0, 30)] = `OK: ${JSON.stringify(res.rows[0])}`;
    } catch (e) {
      results[testUrl.slice(0, 30)] = `ERR: ${(e as Error).message}`;
    }
  }

  return NextResponse.json({ results, libsqlVersion: require('@libsql/client/package.json').version });
}
