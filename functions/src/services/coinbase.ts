import axios from 'axios';
import { CoinbaseAccessResponse, CoinbaseWallet } from '../interfaces/coinbase';

export const coinbaseApiUrl = 'https://api.coinbase.com';

export const COINBASE_AUTH = {
  client_id: '8ad3a3e1c85af0f56ee3f305b4930a67d8b126df89504c53ae871731ed186a2a',
  client_secret: 'ce0e6c99fc27c887ae42b9fa212bf12678cd329ba1330a32849ef738b8c40af8',
  response_type: 'code',
  scope: 'wallet:user:read wallet:accounts:read wallet:transactions:read wallet:addresses:read',
  authorizeUrl: 'https://www.coinbase.com/oauth/authorize',
  oauthTokenUrl: `https://api.coinbase.com/oauth/token`,
  accountsUrl: 'https://api.coinbase.com/v2/accounts?limit=100',
  grant_type: 'authorization_code',
  account: 'all',
};

export async function getAccounts(
  token: string | null,
  nextUri?: string
): Promise<CoinbaseWallet[]> {
  // get user data
  const query = nextUri ? `${coinbaseApiUrl}${nextUri}` : `${COINBASE_AUTH.accountsUrl}`;

  const response = await axios.get(query, {
    headers: { Authorization: `Bearer ${token}`, 'CB-Version': '2021-04-10' },
  });

  const data = response.data;

  // pagination
  if (data.pagination.next_uri) {
    return data.data.concat(await getAccounts(token, data.pagination.next_uri));
  } else {
    return data.data;
  }
}

export async function refreshTokenAccess(refresh_token: string): Promise<CoinbaseAccessResponse> {
  const response = await axios.post(COINBASE_AUTH.oauthTokenUrl, {
    grant_type: 'refresh_token',
    client_id: COINBASE_AUTH.client_id,
    client_secret: COINBASE_AUTH.client_secret,
    refresh_token,
  });
  return response.data;
}
