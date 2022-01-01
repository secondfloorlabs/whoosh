import { captureMessage } from '@sentry/react';
import axios from 'axios';
import {
  SolanaTransaction,
  SplToken,
  StakedAccount,
  StakedAccountResponse,
} from 'src/interfaces/solana';
import { SOL_PER_LAMPORT } from 'src/utils/constants';
import * as solanaWeb3 from '@solana/web3.js';
import { listSolanaTransactions } from 'src/utils/prices';

export const NATIVE_TOKEN = {
  coinGeckoId: 'solana',
  name: 'Solana',
  symbol: 'SOL',
};

export const STAKED_SOL = {
  coinGeckoId: 'solana',
  name: 'Staked Solana',
  symbol: 'SOL',
};

export const splTokens: SplToken[] = [
  {
    publicKey: 'sinjBMHhAuvywW3o87uXHswuRXb3c7TfqgAdocedtDj',
    coinGeckoId: 'invictus',
    name: 'Staked Invictus',
    symbol: 'IN',
  },
  {
    publicKey: 'inL8PMVd6iiW3RCBJnr5AsrRN6nqr4BTrcNuQWQSkvY',
    coinGeckoId: 'invictus',
    name: 'Invictus',
    symbol: 'IN',
  },
  {
    publicKey: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    coinGeckoId: 'usd-coin',
    name: 'USDC',
    symbol: 'USDC',
  },
];

export const getSolanaStakeAccounts = async (address: string): Promise<StakedAccount[]> => {
  const response = await axios.get(`https://api.solscan.io/account/stake?address=${address}`);

  if (!response) captureMessage(`No price found for coin: SOL for address: ${address}`);

  const stakedResponse: StakedAccountResponse = response.data;

  const stakedAccounts: StakedAccount[] = [];

  if (stakedResponse.success) {
    for (const value of Object.values(stakedResponse.data)) {
      if (value.amount) {
        const stakedAccount = {
          balance: Number(value.amount) * SOL_PER_LAMPORT,
          address: value.stakeAccount,
        };
        stakedAccounts.push(stakedAccount);
      }
    }
  }
  return stakedAccounts;
};

async function addTxDetails(
  solTxs: { txHash: string }[],
  connection: solanaWeb3.Connection
): Promise<SolanaTransaction[]> {
  const detailedTxs = [];
  for (let tx of solTxs) {
    const detailedTx = await connection.getTransaction(tx.txHash);
    const accounts = detailedTx?.transaction.message.accountKeys.map((key) => key.toString());
    detailedTxs.push({ ...detailedTx, accounts, txHash: tx.txHash });
  }
  return detailedTxs as SolanaTransaction[];
}

export const getDetailedTxs = async (
  address: string,
  tokenAccounts: string[],
  connection: solanaWeb3.Connection
): Promise<SolanaTransaction[]> => {
  let solTransactions = await listSolanaTransactions(address);
  for (let tokenAccount of tokenAccounts) {
    solTransactions = solTransactions.concat(await listSolanaTransactions(tokenAccount));
  }
  solTransactions = solTransactions.sort(
    (a: { blockTime: number }, b: { blockTime: number }) => a.blockTime - b.blockTime
  );

  return await addTxDetails(solTransactions, connection);
};
