import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { OkxApiClient } from '@/lib/okx-api';

export async function POST() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });

    if (
      !settings?.okxApiKey ||
      !settings?.okxSecretKey ||
      !settings?.okxPassphrase ||
      !settings?.okxApiKeyIv ||
      !settings?.okxSecretKeyIv ||
      !settings?.okxPassphraseIv
    ) {
      return NextResponse.json(
        { success: false, error: 'OKX API credentials are not configured.' },
        { status: 400 }
      );
    }

    let apiKey: string;
    let secretKey: string;
    let passphrase: string;

    try {
      apiKey = decrypt(settings.okxApiKey, settings.okxApiKeyIv);
      secretKey = decrypt(settings.okxSecretKey, settings.okxSecretKeyIv);
      passphrase = decrypt(settings.okxPassphrase, settings.okxPassphraseIv);
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to decrypt credentials: ' + (err instanceof Error ? err.message : String(err)),
        },
        { status: 500 }
      );
    }

    const client = new OkxApiClient(apiKey, secretKey, passphrase);
    const result = await client.getBalance();

    if (result.code !== '0') {
      return NextResponse.json({
        success: false,
        error: result.msg ?? 'OKX API returned an error',
        code: result.code,
      });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[POST /api/settings/test]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection test failed' },
      { status: 500 }
    );
  }
}
