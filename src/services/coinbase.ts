import axios, { AxiosResponse } from 'axios';
import { LINKS } from 'src/utils/constants';
import { isProduction } from 'src/utils/helpers';
import {
  CoinbaseAccessResponse,
  CoinbaseTransactionsComplete,
  CoinbaseWallet,
} from 'src/interfaces/coinbase';

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

export const createCoinbaseUrl = (): string => {
  const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;
  const url = `${COINBASE_AUTH.authorizeUrl}?client_id=${COINBASE_AUTH.client_id}&redirect_uri=${redirect_uri}&response_type=${COINBASE_AUTH.response_type}&scope=${COINBASE_AUTH.scope}&account=${COINBASE_AUTH.account}`;
  return encodeURI(url);
};

export async function accessAccount(
  token: string | null,
  nextUri?: string
): Promise<CoinbaseWallet[]> {
  // get user data
  const query = nextUri ? `${coinbaseApiUrl}${nextUri}` : `${COINBASE_AUTH.accountsUrl}`;

  const response: AxiosResponse = await axios.get(query, {
    headers: { Authorization: `Bearer ${token}`, 'CB-Version': '2021-04-10' },
  });

  const data = response.data;

  // pagination
  if (data.pagination.next_uri) {
    return data.data.concat(await accessAccount(token, data.pagination.next_uri));
  } else {
    return data.data;
  }
}

export async function authCodeAccess(code: string): Promise<CoinbaseAccessResponse> {
  const response: AxiosResponse<CoinbaseAccessResponse> = await axios.post(
    COINBASE_AUTH.oauthTokenUrl,
    {
      grant_type: COINBASE_AUTH.grant_type,
      code,
      client_id: COINBASE_AUTH.client_id,
      client_secret: COINBASE_AUTH.client_secret,
      redirect_uri: isProduction() ? LINKS.baseURL : LINKS.localURL,
    }
  );
  return response.data;
}

export async function refreshTokenAccess(): Promise<CoinbaseAccessResponse> {
  const response: AxiosResponse<CoinbaseAccessResponse> = await axios.post(
    COINBASE_AUTH.oauthTokenUrl,
    {
      grant_type: 'refresh_token',
      client_id: COINBASE_AUTH.client_id,
      client_secret: COINBASE_AUTH.client_secret,
      refresh_token: localStorage.getItem('coinbaseRefreshToken'),
    }
  );
  return response.data;
}

export const storeTokensLocally = (access: CoinbaseAccessResponse): void => {
  localStorage.setItem('coinbaseAccessToken', access.access_token);
  localStorage.setItem('coinbaseRefreshToken', access.refresh_token);
};

export async function getTransactions(
  walletId: string,
  nextUri?: string
): Promise<CoinbaseTransactionsComplete[]> {
  const query = nextUri
    ? `${coinbaseApiUrl}${nextUri}`
    : `${coinbaseApiUrl}/v2/accounts/${walletId}/transactions?limit=100`;

  const response: AxiosResponse = await axios.get(query, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('coinbaseAccessToken')}`,
      'CB-Version': '2021-04-10',
    },
  });

  const data = response.data;

  // pagination
  if (data.pagination.next_uri) {
    return data.data.concat(await getTransactions(walletId, data.pagination.next_uri));
  } else {
    return data.data;
  }
}
