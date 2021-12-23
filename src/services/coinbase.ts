import axios, { AxiosResponse } from 'axios';
import { COINBASE_AUTH, LINKS } from 'src/utils/constants';
import { isProduction } from 'src/utils/helpers';
import {
  CoinbaseAccessResponse,
  CoinbaseAccountResponse,
  CoinbasePrices,
  CoinbaseTransactions,
  CoinbaseTransactionsComplete,
  CoinbaseWallet,
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
  //"/v2/accounts/50e9fe78-d3e6-516f-9a03-815bb0e0d3d0/transactions?limit=100&starting_after=db1196ac-5866-5101-abd1-924a5ce40c37"
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

  if (data.pagination.next_uri) {
    // console.log('more');

    return data.data.concat(await getTransactions(walletId, data.pagination.next_uri));
  } else {
    return data.data;
  }
}
