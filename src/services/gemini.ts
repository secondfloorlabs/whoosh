import axios from 'axios';
import { LINKS } from 'src/utils/constants';
import { isProduction } from 'src/utils/helpers';
import { Balance, Earn, GeminiAccessResponse, Transfer } from 'src/interfaces/gemini';

export const GEMINI_BASE_URL = 'https://exchange.gemini.com';

export const GEMINI_AUTH = {
  client_id: '61c7adff-a5df-4dad-8dbc-63ac58372dc5',
  client_secret: '61c7adff-f7e6-493f-bbf9-9c25240a8e65',
  response_type: 'code',
  scope:
    'addresses:read,history:read,account:read,orders:read,payments:read,balances:read,banks:read',
};

export const createGeminiUrl = (): string => {
  const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;

  const url = `${GEMINI_BASE_URL}/auth?client_id=${GEMINI_AUTH.client_id}&response_type=${GEMINI_AUTH.response_type}&redirect_uri=${redirect_uri}&state=82350325&scope=${GEMINI_AUTH.scope}`;

  return url;
};

export async function authCodeAccess(code: string): Promise<GeminiAccessResponse> {
  const query = `https://us-central1-whooshwallet.cloudfunctions.net/api/geminiAuth?code=${code}`;
  const response = await axios.get(query);
  return response.data;
}

export async function refreshTokenAccess(
  refreshToken: string | null
): Promise<GeminiAccessResponse> {
  const query = `http://localhost:5001/whooshwallet/us-central1/api/geminiRefresh?refresh_token=${refreshToken}`;
  const response = await axios.get(query);
  return response.data;
}

export async function accessAccount(accessToken: string | null): Promise<Balance[] | Earn[]> {
  const query = `http://localhost:5001/whooshwallet/us-central1/api/geminiAccounts?access_token=${accessToken}`;
  const response = await axios.get(query);
  return response.data;
}

export const storeTokensLocally = (access: GeminiAccessResponse): void => {
  localStorage.setItem('geminiAccessToken', access.access_token);
  localStorage.setItem('geminiRefreshToken', access.refresh_token);
};

export async function getHistory(accessToken: string | null): Promise<Transfer[]> {
  const query = `http://localhost:5001/whooshwallet/us-central1/api/geminiHistory?access_token=${accessToken}`;
  const response = await axios.get(query);
  return response.data;
}
