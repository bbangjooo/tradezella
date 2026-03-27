import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 4) return '****';
  return '****' + key.slice(-4);
}

// Debug: check env vars (remove after fixing)
export async function OPTIONS() {
  return NextResponse.json({
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    tursoUrlPrefix: (process.env.TURSO_DATABASE_URL || '').slice(0, 20),
    hasAuthToken: !!process.env.TURSO_AUTH_TOKEN,
    hasEncKey: !!process.env.ENCRYPTION_KEY,
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: (process.env.DATABASE_URL || '').slice(0, 20),
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });

    if (!settings) {
      return NextResponse.json({
        id: 'default',
        okxApiKey: null,
        okxSecretKey: null,
        okxPassphrase: null,
        lastSyncAt: null,
        syncIntervalMin: 15,
        autoSync: false,
      });
    }

    return NextResponse.json({
      id: settings.id,
      okxApiKey: maskKey(settings.okxApiKey),
      okxSecretKey: maskKey(settings.okxSecretKey),
      okxPassphrase: maskKey(settings.okxPassphrase),
      lastSyncAt: settings.lastSyncAt,
      syncIntervalMin: settings.syncIntervalMin,
      autoSync: settings.autoSync,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('[GET /api/settings]', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { okxApiKey, okxSecretKey, okxPassphrase, syncIntervalMin, autoSync } = body;

    const data: Record<string, unknown> = {};

    if (okxApiKey !== undefined) {
      const { encrypted, iv } = encrypt(okxApiKey);
      data.okxApiKey = encrypted;
      data.okxApiKeyIv = iv;
    }

    if (okxSecretKey !== undefined) {
      const { encrypted, iv } = encrypt(okxSecretKey);
      data.okxSecretKey = encrypted;
      data.okxSecretKeyIv = iv;
    }

    if (okxPassphrase !== undefined) {
      const { encrypted, iv } = encrypt(okxPassphrase);
      data.okxPassphrase = encrypted;
      data.okxPassphraseIv = iv;
    }

    if (syncIntervalMin !== undefined) data.syncIntervalMin = syncIntervalMin;
    if (autoSync !== undefined) data.autoSync = autoSync;

    data.updatedAt = new Date();

    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });

    return NextResponse.json({
      id: settings.id,
      okxApiKey: maskKey(settings.okxApiKey),
      okxSecretKey: maskKey(settings.okxSecretKey),
      okxPassphrase: maskKey(settings.okxPassphrase),
      lastSyncAt: settings.lastSyncAt,
      syncIntervalMin: settings.syncIntervalMin,
      autoSync: settings.autoSync,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/settings]', msg, error);
    return NextResponse.json({ error: 'Failed to save settings', detail: msg }, { status: 500 });
  }
}
