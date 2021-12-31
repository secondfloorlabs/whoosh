import * as express from 'express';
import { db } from '../services/firebase';
import { COLLECTIONS } from '../utils/constants';
import { User } from '../interfaces/firebaseSchema';
import { getAccounts, refreshTokenAccess } from '../services/coinbase';
import { CoinbaseWallet } from '../interfaces/coinbase';

/**
 * Updates user wallet collection with current balances for all positive accounts
 */
const updateCoinbaseAccount = async (_req: express.Request, res: express.Response) => {
  const usersWithCoinbase = await db
    .collection(COLLECTIONS.USER)
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
        accounts = await getAccounts(access_token);
      } catch (err) {
        // access token expired, retrieve new tokens using refresh_token
        const access = await refreshTokenAccess(refresh_token);

        db.collection(COLLECTIONS.USER)
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

        accounts = await getAccounts(access.access_token);
      }

      return [...accounts.filter((account) => +parseFloat(account.balance.amount) > 0)];
    })
  );

  // store in the wallet table based on the account id
  await Promise.all(
    users.map(async (user) => {
      accounts.flat().map((account) => {
        db.collection(COLLECTIONS.WALLET)
          .doc(user.userUid)
          .collection(COLLECTIONS.COINBASE)
          .doc(account.id)
          .set({ account }, { merge: true });
      });
    })
  );

  return res.json({});
};

export { updateCoinbaseAccount };
