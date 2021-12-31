import * as express from 'express';
import { getAccountLedger, getAccounts } from '../services/coinbasePro';
import { db } from '../services/firebase';
import { COLLECTIONS } from '../utils/constants';
import { User } from '../interfaces/firebase';
import { CoinbaseProAccounts } from '../interfaces/coinbasePro';

const coinbaseProAccounts = async (req: express.Request, res: express.Response) => {
  const { cb_access_key, cb_access_passphrase, secret } = req.query;

  if (!cb_access_key && !cb_access_passphrase && !secret) {
    return res.status(400).json({ err: 'missing query params' });
  }

  try {
    const response = await getAccounts(
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
    const response = await getAccountLedger(
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

const updateCoinbaseProAccount = async (_req: express.Request, res: express.Response) => {
  const usersWithCoinbasePro = await db
    .collection(COLLECTIONS.USER)
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

      const accountsResponse = await getAccounts(cb_access_key, cb_access_passphrase, secret);

      const accounts: CoinbaseProAccounts[] = accountsResponse.data;

      return [...accounts.filter((account) => +parseFloat(account.balance) > 0)];
    })
  );

  // store in the wallet table based on the account id
  await Promise.all(
    users.map(async (user) => {
      accounts.flat().map((account) => {
        db.collection(COLLECTIONS.WALLET)
          .doc(user.userUid)
          .collection(COLLECTIONS.COINBASE_PRO)
          .doc(account.id)
          .set({ account }, { merge: true });
      });
    })
  );

  return res.json(accounts);
};

export { coinbaseProAccounts, coinbaseProLedger, updateCoinbaseProAccount };
