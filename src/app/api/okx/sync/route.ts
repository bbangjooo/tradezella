import { NextResponse } from 'next/server';
import { syncTrades } from '@/lib/okx-sync';
import { getAuthUser, unauthorized } from '@/lib/get-user';

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const result = await syncTrades(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/okx/sync]', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
