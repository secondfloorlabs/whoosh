import * as express from 'express';
import { db, User, Collections } from '../services/firebase';
import {
  getCurrentSolWorth,
  getSolanaStakeAccounts,
  NATIVE_TOKEN,
  STAKED_SOL,
} from '../services/solana';
import * as solanaWeb3 from '@solana/web3.js';

/**
 * Updates user wallet collection with current balances for all solana accounts
 */
const updateSolanaAssets = async (_req: express.Request, res: express.Response) => {
  const usersWithSolana = await db
    .collection(Collections.USER)
    .orderBy(`access.solanaAddress`)
    .get();

  const users = usersWithSolana.docs.map((doc) => {
    return doc.data() as User;
  });

  // get all solana accounts for a user
  const accounts = await Promise.all(
    users.map(async (user) => {
      const solanaAddress = user.access.solanaAddress;

      const pubKey = new solanaWeb3.PublicKey(solanaAddress);
      const { balance } = await getCurrentSolWorth(pubKey);

      const solGeneralAccount = {
        balance,
        address: solanaAddress,
        symbol: NATIVE_TOKEN.symbol,
        name: NATIVE_TOKEN.name,
        network: 'solana',
      };

      const stakedAccounts = await getSolanaStakeAccounts(solanaAddress);

      const solStakedAccounts = stakedAccounts.map((stakedAccount) => {
        const solToken = {
          address: stakedAccount.address,
          network: 'solana',
          balance: stakedAccount.balance,
          symbol: STAKED_SOL.symbol,
          name: STAKED_SOL.name,
        };

        return solToken;
      });

      return [solGeneralAccount, ...solStakedAccounts];
    })
  );

  //   store in the wallet table based on the account id
  //   ... operator to prevent naming map function account
  await Promise.all(
    users.map(async (user) => {
      accounts.flat().map((account) => {
        db.collection(Collections.WALLET)
          .doc(user.userUid)
          .collection(Collections.SOLANA)
          .doc(account.address)
          .set({ ...account }, { merge: true });
      });
    })
  );

  return res.json({});
};

export { updateSolanaAssets };
