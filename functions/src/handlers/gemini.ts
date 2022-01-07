import * as express from 'express';
import axios from 'axios';
import { Collections, db, User } from '../services/firebase';
import {
  geminiBalance,
  geminiEarn,
  geminiRefreshToken,
  geminiAuthUrl,
  geminiAPIUrl,
  client_id,
  client_secret,
} from '../services/gemini';

const geminiAuth = async (req: express.Request, res: express.Response) => {
  const { code } = req.query;

  const requestPath = '/auth/token';
  const query = geminiAuthUrl + requestPath;
  try {
    const response = await axios.post(query, {
      grant_type: 'authorization_code',
      code,
      client_id,
      client_secret,
      redirect_uri: 'https://app.whoosh.fi',
    });

    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(400).json({ err });
  }
};

const geminiRefresh = async (req: express.Request, res: express.Response) => {
  const { refresh_token } = req.query;

  const requestPath = '/auth/token';
  const query = geminiAuthUrl + requestPath;

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

  const balanceQuery = geminiAPIUrl + balancePath;
  const earnQuery = geminiAPIUrl + earnPath;

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
  const query = geminiAPIUrl + requestPath;
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

const updateGeminiAssets = async (req: express.Request, res: express.Response) => {
  const usersWithCoinbase = await db
    .collection(Collections.USER)
    .orderBy(`access.coinbaseAccessToken`)
    .get();

  const users = usersWithCoinbase.docs.map((doc) => {
    return doc.data() as User;
  });

  // get all coinbase accounts with a balance for a user
  const accounts = await Promise.all(
    users.map(async (user) => {
      const access_token = user.access.geminiAccessToken;
      const refresh_token = user.access.geminiRefreshToken;

      try {
        const balances = await geminiBalance(access_token);
        const earn = await geminiEarn(access_token);

        return [...balances, ...earn];
      } catch (err) {
        // invalid access token, use refresh
        const access = await geminiRefreshToken(refresh_token, client_id, client_secret);

        db.collection(Collections.USER)
          .doc(user.userUid)
          .set(
            {
              access: {
                geminiAccessToken: access.access_token,
                geminiRefreshToken: access.refresh_token,
              },
            },
            { merge: true }
          );

        // get accounts again
        const balances = await geminiBalance(access.access_token);
        const earn = await geminiEarn(access.access_token);

        return [...balances, ...earn];
      }
    })
  );

  /**
   * FOR GEMINI ONLY: accountId -> type-currency
   *  store in the wallet table based on the account id
   * ... operator to prevent naming map function account
   */
  await Promise.all(
    users.map(async (user) => {
      accounts.flat().map((account) => {
        db.collection(Collections.WALLET)
          .doc(user.userUid)
          .collection(Collections.GEMINI)
          .doc(`${account.type}-${account.currency}`)
          .set({ ...account }, { merge: true });
      });
    })
  );

  return res.json({});
};

export { geminiAuth, geminiRefresh, geminiAccounts, geminiHistory, updateGeminiAssets };
