import * as express from 'express';
import axios from 'axios';
import crypto = require('crypto');

const coinbaseProAccounts = async (req: express.Request, res: express.Response) => {
  const { cb_access_key, cb_access_passphrase, secret } = req.query;

  const query = 'https://api.exchange.coinbase.com/accounts';
  const cb_access_timestamp = Date.now() / 1000; // in ms

  const requestPath = '/accounts';
  const body = '';
  const method = 'GET';

  // create the prehash string
  const message = cb_access_timestamp + method + requestPath + body;
  const key = Buffer.from(decodeURIComponent(String(secret)), 'base64');

  // create a sha256 hmac with the secret
  const hmac = crypto.createHmac('sha256', key);

  // sign the require message with the hmac + base64 encode the result
  const cb_access_sign = hmac.update(message).digest('base64');

  try {
    const response = await axios.get(query, {
      headers: {
        'cb-access-key': String(cb_access_key),
        'cb-access-passphrase': String(cb_access_passphrase),
        'cb-access-sign': String(cb_access_sign),
        'cb-access-timestamp': String(cb_access_timestamp),
      },
    });
    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(400).json({ err });
  }
};

const coinbaseProLedger = async (req: express.Request, res: express.Response) => {
  const { cb_access_key, cb_access_passphrase, secret, account_id } = req.query;

  const query = `https://api.exchange.coinbase.com/accounts/${account_id}/ledger`;
  const cb_access_timestamp = Date.now() / 1000; // in ms

  const requestPath = `/accounts/${account_id}/ledger`;
  const body = '';
  const method = 'GET';

  // create the prehash string
  const message = cb_access_timestamp + method + requestPath + body;
  const key = Buffer.from(decodeURIComponent(String(secret)), 'base64');

  // create a sha256 hmac with the secret
  const hmac = crypto.createHmac('sha256', key);

  // sign the require message with the hmac + base64 encode the result
  const cb_access_sign = hmac.update(message).digest('base64');

  try {
    const response = await axios.get(query, {
      headers: {
        'cb-access-key': String(cb_access_key),
        'cb-access-passphrase': String(cb_access_passphrase),
        'cb-access-sign': String(cb_access_sign),
        'cb-access-timestamp': String(cb_access_timestamp),
      },
    });
    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(400).json({ err });
  }
};

export { coinbaseProAccounts, coinbaseProLedger };