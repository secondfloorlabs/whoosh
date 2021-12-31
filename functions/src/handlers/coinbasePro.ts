import * as express from 'express';
import { getProAccountLedger, getProAccounts } from '../services/coinbase';
import { db, User, Collections } from '../services/firebase';
import { CoinbaseProAccounts } from '../interfaces/coinbase';

const coinbaseProAccounts = async (req: express.Request, res: express.Response) => {
  const { cb_access_key, cb_access_passphrase, secret } = req.query;

  if (!cb_access_key && !cb_access_passphrase && !secret) {
    return res.status(400).json({ err: 'missing query params' });
  }

  try {
    const response = await getProAccounts(
      String(cb_access_key),
      String(cb_access_passphrase),
      String(secret)
    );
    return res.json(response.data);
  } catch (err) {
    return res.status(400).json({ err });
  }
};

const coinbaseProLedger = async (req: express.Request, res: express.Response) => {
  const { cb_access_key, cb_access_passphrase, secret, account_id } = req.query;

  if (!cb_access_key && !cb_access_passphrase && !secret && !account_id) {
    return res.status(400).json({ err: 'missing query params' });
  }

  try {
    const response = await getProAccountLedger(
      String(cb_access_key),
      String(cb_access_passphrase),
      String(secret),
      String(account_id)
    );
    return res.json(response.data);
  } catch (err) {
    return res.status(400).json({ err });
  }
};

/**
 * Updates user wallet collection with current balances for all positive accounts
 */
const updateCoinbaseProAssets = async (_req: express.Request, res: express.Response) => {
  const usersWithCoinbasePro = await db
    .collection(Collections.USER)
    .orderBy(`access.coinbaseProApiKey`)
    .get();

  const users = usersWithCoinbasePro.docs.map((doc) => {
    return doc.data() as User;
  });

  // get all coinbase pro accounts with a balance for a user
  const accounts = await Promise.all(
    users.map(async (user) => {
      const cb_access_key = user.access.coinbaseProApiKey;
      const cb_access_passphrase = user.access.coinbaseProPassphrase;
      const secret = user.access.coinbaseProSecret;

      const accountsResponse = await getProAccounts(cb_access_key, cb_access_passphrase, secret);

      const accounts: CoinbaseProAccounts[] = accountsResponse.data;

      return [...accounts.filter((account) => +parseFloat(account.balance) > 0)];
    })
  );

  // store in the wallet table based on the account id
  // ... operator to prevent naming map function account
  await Promise.all(
    users.map(async (user) => {
      accounts.flat().map((account) => {
        db.collection(Collections.WALLET)
          .doc(user.userUid)
          .collection(Collections.COINBASE_PRO)
          .doc(account.id)
          .set({ ...account }, { merge: true });
      });
    })
  );

  return res.json({});
};

export { coinbaseProAccounts, coinbaseProLedger, updateCoinbaseProAssets };
