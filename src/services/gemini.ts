import axios, { AxiosResponse } from 'axios';
// import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import { LINKS } from 'src/utils/constants';
import { isProduction } from 'src/utils/helpers';
import { GeminiAccessResponse } from 'src/interfaces/gemini';

// const coinGeckoTimestamps = getCoinGeckoTimestamps();

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

  return encodeURI(url);
};

export async function authCodeAccess(code: string): Promise<GeminiAccessResponse> {
  const query = `${GEMINI_BASE_URL}/auth/token`;
  const response: AxiosResponse = await axios.post(query, {
    grant_type: 'authorization_code',
    code,
    client_id: GEMINI_AUTH.client_id,
    client_secret: GEMINI_AUTH.client_secret,
    redirect_uri: isProduction() ? LINKS.baseURL : LINKS.localURL,
  });

  return response.data;
}

export const storeTokensLocally = (access: GeminiAccessResponse): void => {
  localStorage.setItem('geminiAccessToken', access.access_token);
  localStorage.setItem('geminiRefreshToken', access.refresh_token);
};
