import axios from 'axios';
import { Balance, Earn, GeminiAccessResponse } from '../interfaces/gemini';

const geminiAuthUrl = 'https://exchange.gemini.com';
const geminiAPIUrl = 'https://api.gemini.com';

// TODO: split to two axios calls for balance and earn. Call both
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
