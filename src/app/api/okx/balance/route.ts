import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { OkxApiClient } from '@/lib/okx-api';
import { getAuthUser, unauthorized } from '@/lib/get-user';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const settings = await prisma.settings.findUnique({ where: { userId: user.id } });

    if (
      !settings?.okxApiKey ||
      !settings?.okxSecretKey ||
      !settings?.okxPassphrase ||
      !settings?.okxApiKeyIv ||
      !settings?.okxSecretKeyIv ||
      !settings?.okxPassphraseIv
    ) {
      return NextResponse.json(
        { error: 'OKX API credentials are not configured.' },
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
          error: 'Failed to decrypt credentials: ' + (err instanceof Error ? err.message : String(err)),
        },
        { status: 500 }
      );
    }

    const client = new OkxApiClient(apiKey, secretKey, passphrase);
    const result = await client.getBalance();

    if (result.code !== '0') {
      return NextResponse.json(
        { error: result.msg ?? 'OKX API returned an error', code: result.code },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('[GET /api/okx/balance]', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
