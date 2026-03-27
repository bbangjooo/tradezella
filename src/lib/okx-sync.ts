import { prisma } from './db';
import { decrypt } from './encryption';
import { OkxApiClient } from './okx-api';

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  log: string[];
}

/**
 * Extracts the base symbol from an OKX instId.
 * Examples:
 *   "BTC-USDT-SWAP" → "BTC"
 *   "ETH-USDT-FUTURES" → "ETH"
 *   "BTC-USDT" → "BTC"
 */
function extractSymbol(instId: string): string {
  return instId.split('-')[0] ?? instId;
}

/**
 * Maps OKX posSide/side to our internal side ("long" | "short").
 * OKX posSide values: "long", "short", "net"
 * OKX side values for net mode: "buy" (long) | "sell" (short)
 */
function mapSide(posSide: string, side: string): string {
  if (posSide === 'long') return 'long';
  if (posSide === 'short') return 'short';
  // Net position mode — infer from the opening direction
  if (side === 'buy') return 'long';
  if (side === 'sell') return 'short';
  return side.toLowerCase();
}

export async function syncTrades(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [], log: [] };

  // 1. Read credentials from Settings
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } });

  if (
    !settings?.okxApiKey ||
    !settings?.okxSecretKey ||
    !settings?.okxPassphrase ||
    !settings?.okxApiKeyIv ||
    !settings?.okxSecretKeyIv ||
    !settings?.okxPassphraseIv
  ) {
    result.errors.push('OKX API credentials are not configured.');
    return result;
  }

  let apiKey: string;
  let secretKey: string;
  let passphrase: string;

  try {
    apiKey = decrypt(settings.okxApiKey, settings.okxApiKeyIv);
    secretKey = decrypt(settings.okxSecretKey, settings.okxSecretKeyIv);
    passphrase = decrypt(settings.okxPassphrase, settings.okxPassphraseIv);
  } catch (err) {
    result.errors.push(
      'Failed to decrypt OKX credentials: ' + (err instanceof Error ? err.message : String(err))
    );
    return result;
  }

  const client = new OkxApiClient(apiKey, secretKey, passphrase);

  // 2. Fetch positions history — try multiple instTypes
  const allPositions: any[] = [];
  const instTypes = ['SWAP', 'FUTURES', 'MARGIN'];

  const syncLog: string[] = [];

  for (const instType of instTypes) {
    let after: string | undefined = undefined;
    try {
      do {
        const response = await client.getPositionsHistory(instType, after);

        if (response.code !== '0') {
          const msg = `positions-history ${instType}: code=${response.code} msg=${response.msg}`;
          syncLog.push(msg);
          console.warn(`[okx-sync] ${msg}`);
          break;
        }

        const data: any[] = response.data ?? [];
        syncLog.push(`positions-history ${instType}: ${data.length} records`);

        if (data.length === 0) break;

        allPositions.push(...data);
        after = data[data.length - 1]?.posId;
        if (data.length < 100) break;
      } while (after);
    } catch (err) {
      const msg = `positions-history ${instType} failed: ${err instanceof Error ? err.message : err}`;
      syncLog.push(msg);
      console.warn(`[okx-sync] ${msg}`);
    }
  }

  // 2b. Also fetch from fills endpoint for SPOT trades
  try {
    let after: string | undefined = undefined;
    do {
      const response = await client.getFills('SPOT', after);
      if (response.code !== '0') {
        console.warn(`[okx-sync] fills SPOT: ${response.msg}`);
        break;
      }
      const data: any[] = response.data ?? [];
      if (data.length === 0) break;

      // Group fills by ordId into positions
      const grouped = new Map<string, any[]>();
      for (const fill of data) {
        const key = fill.ordId ?? fill.tradeId;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(fill);
      }

      for (const [ordId, fills] of grouped) {
        const first = fills[0];
        const totalQty = fills.reduce((s: number, f: any) => s + parseFloat(f.fillSz ?? '0'), 0);
        const avgPx = fills.reduce((s: number, f: any) => s + parseFloat(f.fillPx ?? '0') * parseFloat(f.fillSz ?? '0'), 0) / (totalQty || 1);
        const totalFee = fills.reduce((s: number, f: any) => s + parseFloat(f.fee ?? '0'), 0);
        const pnl = fills.reduce((s: number, f: any) => s + parseFloat(f.fillPnl ?? '0'), 0);

        allPositions.push({
          posId: `fill-${ordId}`,
          instId: first.instId ?? '',
          instType: 'SPOT',
          posSide: first.side === 'buy' ? 'long' : 'short',
          direction: first.side ?? '',
          openAvgPx: String(avgPx),
          closeAvgPx: String(avgPx),
          closeTotalPos: String(totalQty),
          lever: '1',
          realizedPnl: String(pnl),
          fee: String(totalFee),
          fundingFee: '0',
          cTime: first.ts ?? String(Date.now()),
          uTime: first.ts ?? String(Date.now()),
        });
      }

      after = data[data.length - 1]?.billId;
      if (data.length < 100) break;
    } while (after);
  } catch (err) {
    console.warn('[okx-sync] fills SPOT failed:', err instanceof Error ? err.message : err);
  }

  syncLog.push(`Total positions fetched: ${allPositions.length}`);
  result.log = syncLog;

  if (allPositions.length === 0) {
    result.errors.push('No positions found from OKX. Check if you have closed positions in the last 90 days.');
    return result;
  }

  // 3. Filter positions after KST 2026-03-26 00:00:00 (UTC 2026-03-25 15:00:00)
  const MIN_TIMESTAMP = new Date('2026-03-25T15:00:00.000Z').getTime();
  const filteredPositions = allPositions.filter((pos) => {
    const ts = parseInt(pos.cTime, 10);
    return !isNaN(ts) && ts >= MIN_TIMESTAMP;
  });

  // 4. Map and upsert each position
  for (const pos of filteredPositions) {
    try {
      const orderId: string = pos.posId;

      // Check for duplicates
      const existing = await prisma.trade.findUnique({ where: { orderId } });
      if (existing) {
        result.skipped++;
        continue;
      }

      const realizedPnl = parseFloat(pos.realizedPnl ?? '0');
      const fee = parseFloat(pos.fee ?? '0');
      const fundingFee = parseFloat(pos.fundingFee ?? '0');
      const netPnl = realizedPnl + fee + fundingFee;

      const entryTime = new Date(parseInt(pos.cTime, 10));
      const exitTime = pos.uTime ? new Date(parseInt(pos.uTime, 10)) : null;

      const holdDuration =
        exitTime ? Math.floor((exitTime.getTime() - entryTime.getTime()) / 1000) : null;

      const symbol = extractSymbol(pos.instId ?? '');
      const side = mapSide(pos.posSide ?? '', pos.direction ?? '');

      await prisma.trade.create({
        data: {
          orderId,
          instId: pos.instId ?? '',
          instType: pos.instType ?? 'SWAP',
          symbol,
          side,
          posSide: pos.posSide ?? null,
          entryPrice: parseFloat(pos.openAvgPx ?? '0'),
          exitPrice: pos.closeAvgPx ? parseFloat(pos.closeAvgPx) : null,
          quantity: parseFloat(pos.closeTotalPos ?? pos.pos ?? '0'),
          leverage: parseInt(pos.lever ?? '1', 10),
          realizedPnl,
          fee,
          fundingFee,
          netPnl,
          entryTime,
          exitTime,
          holdDuration,
          status: 'closed',
          source: 'okx',
          rawData: JSON.stringify(pos),
        },
      });

      result.synced++;
    } catch (err) {
      result.errors.push(
        `Failed to save position ${pos.posId}: ` +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  // 5. Save daily asset snapshot
  try {
    const balanceRes = await client.getBalance();
    if (balanceRes.code === '0' && balanceRes.data?.[0]) {
      const totalEq = parseFloat(balanceRes.data[0].totalEq ?? '0');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's trade stats
      const todayTrades = await prisma.trade.findMany({
        where: {
          entryTime: { gte: today },
        },
      });
      const dailyPnl = todayTrades.reduce((sum, t) => sum + t.netPnl, 0);
      const dailyFee = todayTrades.reduce((sum, t) => sum + t.fee, 0);

      await prisma.dailySnapshot.upsert({
        where: { date: today },
        update: {
          totalBalance: totalEq,
          dailyPnl,
          dailyFee,
          tradeCount: todayTrades.length,
        },
        create: {
          date: today,
          totalBalance: totalEq,
          dailyPnl,
          dailyFee,
          tradeCount: todayTrades.length,
        },
      });
    }
  } catch {
    // Non-fatal — snapshot is best-effort
  }

  // 6. Update lastSyncAt
  try {
    await prisma.settings.update({
      where: { id: 'default' },
      data: { lastSyncAt: new Date() },
    });
  } catch {
    // Non-fatal
  }

  result.log = syncLog;
  return result;
}
