import axios, { AxiosResponse } from 'axios';
import { COINBASE_AUTH, LINKS } from 'src/utils/constants';
import { isProduction } from 'src/utils/helpers';
import {
  CoinbaseAccessResponse,
  CoinbaseAccountResponse,
  CoinbasePrices,
  CoinbaseTransactionsComplete,
} from 'src/services/coinbaseTypes';

export const coinbaseUrl = 'https://api.coinbase.com';

export const createCoinbaseUrl = (): string => {
  const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;
  const url = `${COINBASE_AUTH.authorizeUrl}?client_id=${COINBASE_AUTH.client_id}&redirect_uri=${redirect_uri}&response_type=${COINBASE_AUTH.response_type}&scope=${COINBASE_AUTH.scope}&account=${COINBASE_AUTH.account}`;
  return encodeURI(url);
};

/**
 * Gets coinbase price data converted to USD
 * NOTE: Slugs on Coinbase wallets don't always match CoinGecko API
 * @param tokenSlug
 * @returns
 */
export async function receiveCoinbasePriceData(tokenSlug: any): Promise<string> {
  const response: AxiosResponse<CoinbasePrices> = await axios.get(
    `https://api.coinbase.com/v2/prices/${tokenSlug}-USD/sell`
  );
  return response.data.data.amount;
}

export async function accessAccount(token: string | null): Promise<CoinbaseAccountResponse> {
  // get user data
  const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
    COINBASE_AUTH.accountsUrl,
    { headers: { Authorization: `Bearer ${token}`, 'CB-Version': '2021-04-10' } }
  );
  return response.data;
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
    ? `${coinbaseUrl}${nextUri}`
    : `${coinbaseUrl}/v2/accounts/${walletId}/transactions?limit=100`;

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
