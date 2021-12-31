import axios, { AxiosResponse } from 'axios';
import crypto = require('crypto');

export function createAccessSign(
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

export async function getAccounts(
  cb_access_key: string,
  cb_access_passphrase: string,
  secret: string
): Promise<AxiosResponse> {
  const query = 'https://api.exchange.coinbase.com/accounts';
  const cb_access_timestamp = Date.now() / 1000; // in ms
  const requestPath = '/accounts';
  const method = 'GET';
  const cb_access_sign = createAccessSign(requestPath, method, String(secret), cb_access_timestamp);

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

export async function getAccountLedger(
  cb_access_key: string,
  cb_access_passphrase: string,
  secret: string,
  account_id: string
): Promise<AxiosResponse> {
  const query = `https://api.exchange.coinbase.com/accounts/${account_id}/ledger`;
  const cb_access_timestamp = Date.now() / 1000; // in ms

  const requestPath = `/accounts/${account_id}/ledger`;
  const method = 'GET';
  const cb_access_sign = createAccessSign(requestPath, method, String(secret), cb_access_timestamp);

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
