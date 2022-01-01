import axios from 'axios';
import * as solanaWeb3 from '@solana/web3.js';

const SOL_PER_LAMPORT = 0.000000001;
const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');

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

export interface StakedAccountResponse {
  success: boolean;
  data: {
    address: {
      voter: string;
      amount: string;
      type: string;
      stakeAccount: string;
      staker: string;
      role: string[];
    };
  };
}

export interface StakedAccount {
  balance: number;
  address: string;
}

export const getCurrentSolWorth = async (
  address: solanaWeb3.PublicKey
): Promise<{ balance: number }> => {
  const balance = await connection.getBalance(address);
  const sol = balance * SOL_PER_LAMPORT;
  return { balance: sol };
};

export const getSolanaStakeAccounts = async (address: string): Promise<StakedAccount[]> => {
  const response = await axios.get(`https://api.solscan.io/account/stake?address=${address}`);

  if (!response) return [];

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
