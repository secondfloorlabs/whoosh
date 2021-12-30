import * as express from 'express';
import axios from 'axios';

const geminiBaseUrl = 'https://api.gemini.com';
const client_id = '61c7adff-a5df-4dad-8dbc-63ac58372dc5';
const client_secret = '61c7adff-f7e6-493f-bbf9-9c25240a8e65';

const geminiAuth = async (req: express.Request, res: express.Response) => {
  const { code } = req.query;

  const requestPath = '/auth/token';
  const query = geminiBaseUrl + requestPath;
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
};

const geminiRefresh = async (req: express.Request, res: express.Response) => {
  const { refresh_token } = req.query;

  const requestPath = '/auth/token';
  const query = geminiBaseUrl + requestPath;

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
};

const geminiAccounts = async (req: express.Request, res: express.Response) => {
  const { access_token } = req.query;

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
};

const geminiHistory = async (req: express.Request, res: express.Response) => {
  const { access_token } = req.query;

  const requestPath = '/v1/transfers';
  const query = geminiBaseUrl + requestPath;
  const payload = { request: requestPath };
  const payload_encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

  const headers = {
    Authorization: `Bearer ${access_token}`,
    'X-GEMINI-PAYLOAD': String(payload_encoded),
  };

  try {
    const response = await axios.post(query, {}, { headers });

    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(400).json({ err });
  }
};

export { geminiAuth, geminiRefresh, geminiAccounts, geminiHistory };