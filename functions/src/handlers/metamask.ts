import * as express from 'express';
import { db, User, Collections } from '../services/firebase';
const Moralis = require('moralis/node');
import { components } from 'moralis/types/generated/web3Api';

enum NETWORKS {
  SOLANA = 'solana',
  ETHEREUM = 'eth',
  BINANCE_SMART_CHAIN = 'bsc',
  POLYGON = 'polygon',
  AVALANCHE = 'avalanche',
  FANTOM = 'ftm',
}

interface Chain {
  network: string;
  symbol: string;
  name: string;
  decimals: string;
  covalentId: string;
}

const SUPPORTED_CHAINS: Chain[] = [
  {
    network: NETWORKS.ETHEREUM,
    symbol: 'ETH',
    name: 'ethereum',
    decimals: '18',
    covalentId: '1',
  },
  {
    network: NETWORKS.BINANCE_SMART_CHAIN,
    symbol: 'BNB',
    name: 'binance',
    decimals: '18',
    covalentId: '56',
  },
  {
    network: NETWORKS.POLYGON,
    symbol: 'MATIC',
    name: 'matic',
    decimals: '18',
    covalentId: '137',
  },
  {
    network: NETWORKS.AVALANCHE,
    symbol: 'AVAX',
    name: 'avalanche',
    decimals: '18',
    covalentId: '43114',
  },
  {
    network: NETWORKS.FANTOM,
    symbol: 'FTM',
    name: 'fantom',
    decimals: '18',
    covalentId: '250',
  },
];

interface AccountMetadata {
  balance: string;
  decimals: string;
  symbol: string;
  name: string;
  token_address?: string;
}

/**
 * Updates user wallet collection with current balances for all positive accounts
 */
const updateMetamaskAssets = async (_req: express.Request, res: express.Response) => {
  const usersWithMetamask = await db
    .collection(Collections.USER)
    .orderBy(`access.metamaskAddress`)
    .get();

  const users = usersWithMetamask.docs.map((doc) => {
    return doc.data() as User;
  });

  const serverUrl = 'https://pbmzxsfg3wj1.usemoralis.com:2053/server';
  const appId = 'TcKOpTzYpLYgcelP2i21aJpclyAMiLUvRG5H5Gng';

  await Moralis.start({ serverUrl, appId });

  // get all metamask accounts with a balance for a user
  const accounts = await Promise.all(
    users.map(async (user) => {
      const metamaskAddress = user.access.metamaskAddress;

      const accounts = await Promise.all(
        SUPPORTED_CHAINS.map(async (chain) => {
          // Get metadata for one token
          const options = {
            chain: chain.network as components['schemas']['chainList'],
            address: metamaskAddress,
          };
          const nativeBalance = await Moralis.Web3API.account.getNativeBalance(options);

          const balances: AccountMetadata[] = await Moralis.Web3API.account.getTokenBalances(
            options
          );

          // Native token
          balances.push({
            balance: nativeBalance.balance,
            symbol: chain.symbol,
            decimals: chain.decimals,
            name: chain.name,
          });

          return [...balances.flat()];
        })
      );

      return [...accounts.flat()];
    })
  );

  // store in the wallet table based on the account id
  // ... operator to prevent naming map function account
  await Promise.all(
    users.map(async (user) => {
      accounts.flat().map((account) => {
        db.collection(Collections.WALLET)
          .doc(user.userUid)
          .collection(Collections.METAMASK)
          .doc(`${account.name}-${account.symbol}`)
          .set({ ...account }, { merge: true });
      });
    })
  );

  return res.json({});
};

export { updateMetamaskAssets };
