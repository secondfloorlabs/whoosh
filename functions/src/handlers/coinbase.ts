import * as express from 'express';
import { db, User, Collections } from '../services/firebase';
import { getCoinbaseAccounts, refreshCoinbaseTokenAccess } from '../services/coinbase';
import { CoinbaseWallet } from '../interfaces/coinbase';

/**
 * Updates user wallet collection with current balances for all positive accounts
 */
const updateCoinbaseAssets = async (_req: express.Request, res: express.Response) => {
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
      const access_token = user.access.coinbaseAccessToken;
      const refresh_token = user.access.coinbaseRefreshToken;

      let accounts: CoinbaseWallet[];

      try {
        accounts = await getCoinbaseAccounts(access_token);
      } catch (err) {
        // access token expired, retrieve new tokens using refresh_token
        const access = await refreshCoinbaseTokenAccess(refresh_token);

        db.collection(Collections.USER)
          .doc(user.userUid)
          .set(
            {
              access: {
                coinbaseAccessToken: access.access_token,
                coinbaseRefreshToken: access.refresh_token,
              },
            },
            { merge: true }
          );

        accounts = await getCoinbaseAccounts(access.access_token);
      }

      return [...accounts.filter((account) => +parseFloat(account.balance.amount) > 0)];
    })
  );

  // store in the wallet table based on the account id
  // ... operator to prevent naming map function account
  await Promise.all(
    users.map(async (user) => {
      accounts.flat().map((account) => {
        db.collection(Collections.WALLET)
          .doc(user.userUid)
          .collection(Collections.COINBASE)
          .doc(account.id)
          .set({ ...account }, { merge: true });
      });
    })
  );

  return res.json({});
};

export { updateCoinbaseAssets };
