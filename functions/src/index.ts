import * as functions from 'firebase-functions';
import * as express from 'express';
import cors = require('cors');
import axios from 'axios';
import crypto = require('crypto');

const app = express();
app.use(cors({ origin: true }));

app.get('/', (_req, res) => res.status(200).send('Hey there!'));

app.get('/coinbaseProAccounts', async (req, res) => {
  // https://docs.cloud.coinbase.com/exchange/docs/authorization-and-authentication
  const { cb_access_key, cb_access_passphrase, secret } = req.query;

  const query = 'https://api.exchange.coinbase.com/accounts';
  const cb_access_timestamp = Date.now() / 1000; // in ms

  const requestPath = '/accounts';
  const body = '';
  const method = 'GET';

  // create the prehash string by concatenating required parts
  const message = cb_access_timestamp + method + requestPath + body;

  // decode the base64 secret
  const key = Buffer.from(decodeURIComponent(String(secret)), 'base64');

  // create a sha256 hmac with the secret
  const hmac = crypto.createHmac('sha256', key);

  // sign the require message with the hmac + base64 encode the result
  const cb_access_sign = hmac.update(message).digest('base64');

  const response = await axios.get(query, {
    headers: {
      'cb-access-key': String(cb_access_key),
      'cb-access-passphrase': String(cb_access_passphrase),
      'cb-access-sign': String(cb_access_sign),
      'cb-access-timestamp': String(cb_access_timestamp),
    },
  });

  if (!response) {
    return res.status(400).json({ error: `No accounts found for coinbase account` });
  }

  return res.status(200).json(response.data);
});

exports.api = functions.https.onRequest(app);
