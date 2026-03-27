import * as crypto from 'crypto';

const BASE_URL = 'https://www.okx.com';

export class OkxApiClient {
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;

  constructor(apiKey: string, secretKey: string, passphrase: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passphrase = passphrase;
  }

  private sign(timestamp: string, method: string, path: string, body?: string): string {
    const message = timestamp + method.toUpperCase() + path + (body ?? '');
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }

  private async request(
    method: string,
    path: string,
    params?: Record<string, string>
  ): Promise<any> {
    let fullPath = path;

    if (params && Object.keys(params).length > 0) {
      const query = new URLSearchParams(params).toString();
      fullPath = `${path}?${query}`;
    }

    const timestamp = new Date().toISOString();
    const isGet = method.toUpperCase() === 'GET';
    const sign = this.sign(timestamp, method, fullPath, isGet ? '' : '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'x-simulated-trading': '0',
    };

    const response = await fetch(`${BASE_URL}${fullPath}`, {
      method: method.toUpperCase(),
      headers,
    });

    // OKX sometimes returns HTTP 500 but still has a valid JSON body with error code
    // Try to parse JSON regardless of status code
    const json = await response.json().catch(() => null);

    if (!response.ok && !json) {
      throw new Error(`OKX API error: ${response.status} ${response.statusText}`);
    }

    return json ?? { code: '-1', msg: 'Empty response', data: [] };
  }

  /**
   * GET /api/v5/account/positions-history
   * @param instType  Instrument type, e.g. "SWAP", "FUTURES", "MARGIN"
   * @param after     Pagination cursor — returns records earlier than this posId
   */
  async getPositionsHistory(instType?: string, after?: string): Promise<any> {
    const params: Record<string, string> = {};
    if (instType) params.instType = instType;
    if (after) params.after = after;
    return this.request('GET', '/api/v5/account/positions-history', params);
  }

  /**
   * GET /api/v5/trade/fills
   * @param instType  Instrument type
   * @param after     Pagination cursor — returns records earlier than this billId
   */
  async getFills(instType?: string, after?: string): Promise<any> {
    const params: Record<string, string> = {};
    if (instType) params.instType = instType;
    if (after) params.after = after;
    return this.request('GET', '/api/v5/trade/fills', params);
  }

  /**
   * GET /api/v5/trade/orders-history-archive
   * @param instType  Instrument type (required by OKX)
   * @param after     Pagination cursor — returns records earlier than this ordId
   */
  async getOrdersHistory(instType?: string, after?: string): Promise<any> {
    const params: Record<string, string> = {};
    if (instType) params.instType = instType;
    if (after) params.after = after;
    return this.request('GET', '/api/v5/trade/orders-history-archive', params);
  }

  /**
   * GET /api/v5/account/balance
   */
  async getBalance(): Promise<any> {
    return this.request('GET', '/api/v5/account/balance');
  }

  /**
   * GET /api/v5/account/bills
   * @param type   Bill type
   * @param after  Pagination cursor — returns records earlier than this billId
   */
  async getBills(type?: string, after?: string): Promise<any> {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (after) params.after = after;
    return this.request('GET', '/api/v5/account/bills', params);
  }
}
