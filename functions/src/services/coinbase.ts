import axios, { AxiosResponse } from 'axios';
import crypto = require('crypto');
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

export async function getCoinbaseAccounts(
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
    return data.data.concat(await getCoinbaseAccounts(token, data.pagination.next_uri));
  } else {
    return data.data;
  }
}

export async function refreshCoinbaseTokenAccess(
  refresh_token: string
): Promise<CoinbaseAccessResponse> {
  const response = await axios.post(COINBASE_AUTH.oauthTokenUrl, {
    grant_type: 'refresh_token',
    client_id: COINBASE_AUTH.client_id,
    client_secret: COINBASE_AUTH.client_secret,
    refresh_token,
  });
  return response.data;
}

function createProAccessSign(
  requestPath: string,
  method: string,
  secret: string,
  cb_access_timestamp: number
): string {
  // create the prehash string
  const message = cb_access_timestamp + method + requestPath;
  const key = Buffer.from(decodeURIComponent(String(secret)), 'base64');

  // create a sha256 hmac with the secret
  const hmac = crypto.createHmac('sha256', key);

  // sign the require message with the hmac + base64 encode the result
  const cb_access_sign = hmac.update(message).digest('base64');
  return cb_access_sign;
}

export async function getProAccounts(
  cb_access_key: string,
  cb_access_passphrase: string,
  secret: string
): Promise<AxiosResponse> {
  const query = 'https://api.exchange.coinbase.com/accounts';
  const cb_access_timestamp = Date.now() / 1000; // in ms
  const requestPath = '/accounts';
  const method = 'GET';
  const cb_access_sign = createProAccessSign(
    requestPath,
    method,
    String(secret),
    cb_access_timestamp
  );

  const response = await axios.get(query, {
    headers: {
      'cb-access-key': String(cb_access_key),
      'cb-access-passphrase': String(cb_access_passphrase),
      'cb-access-sign': cb_access_sign,
      'cb-access-timestamp': String(cb_access_timestamp),
    },
  });

  return response;
}

export async function getProAccountLedger(
  cb_access_key: string,
  cb_access_passphrase: string,
  secret: string,
  account_id: string
): Promise<AxiosResponse> {
  const query = `https://api.exchange.coinbase.com/accounts/${account_id}/ledger`;
  const cb_access_timestamp = Date.now() / 1000; // in ms

  const requestPath = `/accounts/${account_id}/ledger`;
  const method = 'GET';
  const cb_access_sign = createProAccessSign(
    requestPath,
    method,
    String(secret),
    cb_access_timestamp
  );

  const response = await axios.get(query, {
    headers: {
      'cb-access-key': String(cb_access_key),
      'cb-access-passphrase': String(cb_access_passphrase),
      'cb-access-sign': cb_access_sign,
      'cb-access-timestamp': String(cb_access_timestamp),
    },
  });

  return response;
}
