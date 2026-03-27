import { NextResponse } from 'next/server';
import { syncTrades } from '@/lib/okx-sync';

export async function POST() {
  try {
    const result = await syncTrades();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/okx/sync]', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
