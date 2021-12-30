import * as functions from 'firebase-functions';
import * as express from 'express';
import cors = require('cors');
import axios from 'axios';
import crypto = require('crypto');

const app = express();
app.use(cors());

app.get('/', (_req, res) => res.status(200).send('Hey there!'));

app.get('/coinbaseProAccounts', async (req, res) => {
  // https://docs.cloud.coinbase.com/exchange/docs/authorization-and-authentication
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
});

app.get('/coinbaseProLedger', async (req, res) => {
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
});

app.get('/geminiAuth', async (req, res) => {
  const { code } = req.query;

  const client_id = '61c7adff-a5df-4dad-8dbc-63ac58372dc5';
  const client_secret = '61c7adff-f7e6-493f-bbf9-9c25240a8e65';

  const query = `https://exchange.gemini.com/auth/token`;
  try {
    const response = await axios.post(query, {
      grant_type: 'authorization_code',
      code,
      client_id,
      client_secret,
      redirect_uri: 'https://app.whoosh.finance',
    });

    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(400).json({ err });
  }
});

app.get('/geminiRefresh', async (req, res) => {
  const { refresh_token } = req.query;

  const query = `https://exchange.gemini.com/auth/token`;
  const client_id = '61c7adff-a5df-4dad-8dbc-63ac58372dc5';
  const client_secret = '61c7adff-f7e6-493f-bbf9-9c25240a8e65';

  try {
    const response = await axios.post(query, {
      grant_type: 'refresh_token',
      refresh_token,
      client_id,
      client_secret,
    });

    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(400).json({ err });
  }
});

app.get('/geminiAccounts', async (req, res) => {
  const { access_token } = req.query;

  const geminiBaseUrl = 'https://api.gemini.com';

  const balancePath = '/v1/notionalbalances/usd';
  const earnPath = '/v1/balances/earn';

  const balanceQuery = geminiBaseUrl + balancePath;
  const earnQuery = geminiBaseUrl + earnPath;

  const balancePayload = { request: balancePath };
  const earnPayload = { request: earnPath };

  const balancePayloadEncoded = Buffer.from(JSON.stringify(balancePayload)).toString('base64');
  const earnPayloadEncoded = Buffer.from(JSON.stringify(earnPayload)).toString('base64');
  const balanceHeaders = {
    Authorization: `Bearer ${access_token}`,
    'X-GEMINI-PAYLOAD': String(balancePayloadEncoded),
  };

  const earnHeaders = {
    Authorization: `Bearer ${access_token}`,
    'X-GEMINI-PAYLOAD': String(earnPayloadEncoded),
  };

  try {
    const [balanceResponse, earnResponse] = await Promise.all([
      axios.post(balanceQuery, {}, { headers: balanceHeaders }),
      axios.post(earnQuery, {}, { headers: earnHeaders }),
    ]);

    const balance = balanceResponse.data.map((b: any) => ({ ...b, type: 'Balance' }));

    return res.status(200).json([...balance, ...earnResponse.data]);
  } catch (err) {
    return res.status(400).json({ err });
  }
});

exports.api = functions.https.onRequest(app);
