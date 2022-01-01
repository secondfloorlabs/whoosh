import axios from 'axios';

interface GeminiAccessResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
}

enum WalletType {
  BALANCE = 'Balance',
  EARN = 'Earn',
}

interface Balance {
  type: WalletType;
  currency: string;
  amount: string;
  amountNotional: string;
  available: string;
  availableNotional: string;
  availableForWithdrawal: string;
  availableForWithdrawalNotional: string;
}

interface Earn {
  type: WalletType;
  currency: string;
  balance: number;
  available: number;
  availableForWithdrawal: number;
  balanceByProvider: {
    key: {
      balance: number;
    };
  };
}

export const geminiAuthUrl = 'https://exchange.gemini.com';
export const geminiAPIUrl = 'https://api.gemini.com';
export const client_id = '61c7adff-a5df-4dad-8dbc-63ac58372dc5';
export const client_secret = '61c7adff-f7e6-493f-bbf9-9c25240a8e65';

// regular account balances for trading
export async function geminiBalance(access_token: string): Promise<Balance[]> {
  const request = '/v1/notionalbalances/usd';
  const query = geminiAPIUrl + request;

  const payload = { request };

  const payload_encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  const headers = {
    Authorization: `Bearer ${access_token}`,
    'X-GEMINI-PAYLOAD': String(payload_encoded),
  };

  const response = await axios.post(query, {}, { headers });
  const balance = response.data.map((b: any) => ({ ...b, type: 'Balance' }));

  return [...balance];
}

// Earn accounts that have high yield APY
export async function geminiEarn(access_token: string): Promise<Earn[]> {
  const request = '/v1/balances/earn';
  const query = geminiAPIUrl + request;
  const payload = { request };

  const payload_encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  const headers = {
    Authorization: `Bearer ${access_token}`,
    'X-GEMINI-PAYLOAD': String(payload_encoded),
  };

  const response = await axios.post(query, {}, { headers });

  return [...response.data];
}

export async function geminiRefreshToken(
  refresh_token: string,
  client_id: string,
  client_secret: string
): Promise<GeminiAccessResponse> {
  const requestPath = '/auth/token';
  const query = geminiAuthUrl + requestPath;

  const response = await axios.post(query, {
    grant_type: 'refresh_token',
    refresh_token,
    client_id,
    client_secret,
  });

  return response.data;
}
