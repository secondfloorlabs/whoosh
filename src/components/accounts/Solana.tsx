import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import * as solanaWeb3 from '@solana/web3.js';
import axios from 'axios';

import * as actionTypes from 'src/store/actionTypes';

import {
  getCoinPriceFromId,
  listSolanaTransactions,
  getSolanaTokenAccounts,
} from 'src/utils/prices';
import { WALLETS, SOL_PER_LAMPORT } from 'src/utils/constants';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import { mapClosestTimestamp } from 'src/utils/helpers';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { captureMessage } from '@sentry/react';

interface SplToken {
  publicKey: string;
  symbol: string;
  name: string;
  coinGeckoId: string;
}

const NATIVE_TOKEN = {
  coinGeckoId: 'solana',
  name: 'Solana',
  symbol: 'SOL',
};

const STAKED_SOL = {
  coinGeckoId: 'solana',
  name: 'Staked Solana',
  symbol: 'SOL',
};

const splTokens: SplToken[] = [
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

interface StakedAccountResponse {
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

interface StakedAccount {
  balance: number;
  address: string;
}

interface TokenMetadata {
  [tokenAddress: string]: {
    symbol: string;
    name: string;
    coinGeckoId: string;
  };
}

interface TokenBalance {
  balance: number;
  timestamp: number;
  tokenAddress: string;
}

interface SolanaTransaction {
  accounts: string[];
  meta: {
    postBalances: number[];
    postTokenBalances: {
      accountIndex: number;
      mint: string;
      uiTokenAmount: { uiAmountString: string };
    }[];
  };
}

const coinGeckoTimestamps = getCoinGeckoTimestamps();
const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');

const getSolanaStakeAccounts = async (address: string): Promise<StakedAccount[]> => {
  const response = await axios.get(`https://api.solscan.io/account/stake?address=${address}`);

  if (!response) captureMessage(`No price found for coin: SOL for address: ${address}`);

  const stakedResponse: StakedAccountResponse = response.data;

  const stakedAccounts: StakedAccount[] = [];

  if (stakedResponse.success) {
    for (const [key, value] of Object.entries(stakedResponse.data)) {
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

async function addTxDetails(solTxs: { txHash: string }[]): Promise<SolanaTransaction[]> {
  const detailedTxs = [];
  for (let tx of solTxs) {
    const detailedTx = await connection.getTransaction(tx.txHash);
    const accounts = detailedTx?.transaction.message.accountKeys.map((key) => key.toString());
    detailedTxs.push({ ...detailedTx, accounts });
  }
  return detailedTxs as SolanaTransaction[];
}

const Solana = () => {
  const dispatch = useDispatch();
  const [solanaWallet, setSolanaWallet] = useState(false);

  const getDetailedTxs = async (address: string): Promise<SolanaTransaction[]> => {
    let solTransactions = await listSolanaTransactions(address);
    solTransactions = solTransactions.sort(
      (a: { blockTime: number }, b: { blockTime: number }) => a.blockTime - b.blockTime
    );

    return await addTxDetails(solTransactions);
  };

  const getTokenMetadata = (
    tokenAccounts: { mint: { address: string } }[],
    stakedAccounts: string[]
  ): TokenMetadata => {
    const tokenMetadata: TokenMetadata = {};
    tokenMetadata['native'] = NATIVE_TOKEN;

    tokenAccounts.forEach((account) => {
      const splToken = splTokens.find((token) => token.publicKey === account.mint.address);
      if (splToken) {
        tokenMetadata[account.mint.address] = { ...splToken };
      }
    });
    stakedAccounts.forEach((stakedAccount) => {
      tokenMetadata[stakedAccount] = STAKED_SOL;
    });
    return tokenMetadata;
  };

  const getBalancesFromTransactions = (
    transactionsAtPriceTimestamp: SolanaTransaction[],
    address: string,
    solTokenAccounts: string[]
  ): { [tokenAddress: string]: number } => {
    let tokenBalances: { [tokenAddress: string]: number } = {};
    for (let transaction of transactionsAtPriceTimestamp) {
      const nativeAccountIndex = transaction.accounts.findIndex(
        (account: string) => account === address
      );
      tokenBalances['native'] = transaction.meta.postBalances[nativeAccountIndex] * SOL_PER_LAMPORT;
      const postTokenBalances = transaction.meta.postTokenBalances;
      for (let balance of postTokenBalances) {
        const accountIndex = balance.accountIndex;
        const accountAddress = transaction.accounts[accountIndex];
        if (!solTokenAccounts.includes(accountAddress)) {
          continue;
        }
        tokenBalances[balance.mint] = +balance.uiTokenAmount.uiAmountString;
      }
    }
    return tokenBalances;
  };

  const getHistoricalBalances = async (
    address: string,
    stakedAccounts: string[]
  ): Promise<{
    balances: TokenBalance[];
    tokenMetadata: TokenMetadata;
  }> => {
    const balances: TokenBalance[] = [];
    const solTransactions = await getDetailedTxs(address);

    const detailedSolTokenAccount = await getSolanaTokenAccounts(address);
    const solTokenAccounts = detailedSolTokenAccount.map(
      (account: { address: { address: string } }) => account.address.address
    );

    const tokenMetadata = getTokenMetadata(detailedSolTokenAccount, stakedAccounts);
    for (let timestamp of coinGeckoTimestamps) {
      const transactionsAtPriceTimestamp = solTransactions.filter(
        (transaction: any) => transaction.blockTime <= timestamp
      );

      const tokenBalances = getBalancesFromTransactions(
        transactionsAtPriceTimestamp,
        address,
        solTokenAccounts
      );

      for (const [tokenAddress, balance] of Object.entries(tokenBalances)) {
        balances.push({ balance, timestamp, tokenAddress });
      }
    }
    return { balances, tokenMetadata };
  };

  const mergePrices = async (
    address: string,
    allTokens: {
      symbol: string;
      name: string;
      coinGeckoId: string;
      historicalBalance: TokenBalance[];
    }[]
  ) => {
    allTokens.map(async (token) => {
      const tokenGeckoId = token.coinGeckoId;
      const historicalBalances: TokenBalance[] = token.historicalBalance;
      const currentBalance =
        historicalBalances.length === 0
          ? 0
          : historicalBalances[historicalBalances.length - 1].balance;
      try {
        const rawHistoricalPrices = await getCoinPriceFromId(tokenGeckoId);
        const historicalPrices = rawHistoricalPrices.map((historicalPrice: number[]) => {
          const timestamp = Math.floor(historicalPrice[0] / 1000);
          const price = historicalPrice[1];
          return { timestamp, price };
        });
        // Find closest price
        // Include if the coingecko price is closest one to given historicalPrice
        const relevantPrices = mapClosestTimestamp(historicalPrices, historicalBalances);
        const historicalWorth = relevantPrices.map((price) => {
          const balance = historicalBalances.find(
            (balance: TokenBalance) => price.timestamp === balance.timestamp
          );
          if (!balance) {
            throw new Error('Timestamp mismatch');
          }
          const worth = balance.balance * price.price;
          return { worth, timestamp: price.timestamp };
        });
        const currentPrice = historicalPrices[historicalPrices.length - 1].price;
        const lastPrice = historicalPrices[historicalPrices.length - 2].price;

        const completeToken: IToken = {
          walletName: 'phantom',
          balance: currentBalance,
          symbol: token.symbol,
          name: token.name,
          network: 'solana',
          walletAddress: address,
          price: currentPrice,
          lastPrice: lastPrice,
          historicalBalance: historicalBalances,
          historicalPrice: relevantPrices,
          historicalWorth: historicalWorth,
        };
        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      } catch (e) {
        console.error(e);
        const completeToken: IToken = {
          walletName: 'metamask',
          balance: currentBalance,
          symbol: token.symbol,
          name: token.name,
          network: 'solana',
          walletAddress: address,
          historicalBalance: historicalBalances,
        };
        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      }
    });
  };

  const addCurrentSplTokenWorth = async (splToken: SplToken, address: solanaWeb3.PublicKey) => {
    try {
      const tokenAccount = await connection.getTokenAccountsByOwner(address, {
        mint: new solanaWeb3.PublicKey(splToken.publicKey),
      });
      const tokenKey = tokenAccount.value[0].pubkey;
      const value = (await connection.getTokenAccountBalance(tokenKey)).value;
      if (value.amount !== '0' && value.decimals !== 0) {
        const balance = parseFloat(value.amount) / 10 ** value.decimals;
        const coinGeckoId = splToken.coinGeckoId;
        const symbol = splToken.symbol;
        const historicalPrices = await getCoinPriceFromId(coinGeckoId);
        const price = historicalPrices[historicalPrices.length - 1][1];
        const lastPrice = historicalPrices[historicalPrices.length - 2][1];

        dispatch({
          type: actionTypes.ADD_CURRENT_TOKEN,
          token: {
            ...tokenAccount,
            name: splToken.name,
            balance,
            symbol,
            price,
            lastPrice,
            walletAddress: address.toString(),
            walletName: WALLETS.PHANTOM,
            network: 'Solana',
          },
        });
      }
    } catch (err) {
      captureMessage(String(err));
    }
  };

  const getCurrentSolWorth = async (
    address: solanaWeb3.PublicKey
  ): Promise<{ balance: number; price: number; lastPrice: number }> => {
    const balance = await connection.getBalance(address);

    const sol = balance * SOL_PER_LAMPORT;
    let price: number, lastPrice: number;
    const historicalPrices = await getCoinPriceFromId('solana');
    price = historicalPrices[historicalPrices.length - 1][1];
    lastPrice = historicalPrices[historicalPrices.length - 2][1];

    return { balance: sol, price, lastPrice };
  };

  const connectSolana = async (pubKey: solanaWeb3.PublicKey) => {
    setSolanaWallet(true);
    let stakedAccounts: StakedAccount[] = [];
    try {
      const address = new solanaWeb3.PublicKey(pubKey);
      try {
        const { balance, price, lastPrice } = await getCurrentSolWorth(address);

        const solToken: IToken = {
          walletAddress: address.toString(),
          walletName: WALLETS.PHANTOM,
          network: 'Solana',
          symbol: NATIVE_TOKEN.symbol,
          name: NATIVE_TOKEN.name,
          balance,
          price,
          lastPrice,
        };
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: solToken });

        stakedAccounts = await getSolanaStakeAccounts(address.toString());
        stakedAccounts.forEach((stakedAccount) => {
          const solToken: IToken = {
            walletAddress: stakedAccount.address,
            walletName: WALLETS.PHANTOM,
            network: 'Solana',
            balance: stakedAccount.balance,
            symbol: STAKED_SOL.symbol,
            name: STAKED_SOL.name,
            price,
            lastPrice,
          };

          dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: solToken });
        });
      } catch (e) {
        console.error('Failed to get current SOL accounts ', e);
      }

      splTokens.forEach(async (splToken) => {
        addCurrentSplTokenWorth(splToken, address);
      });

      const addressStr = address.toString();
      const stakedAccountAddresses = stakedAccounts.map((account) => account.address);
      const { balances, tokenMetadata } = await getHistoricalBalances(
        addressStr,
        stakedAccountAddresses
      );

      const allTokens = [];
      for (const [tokenAddress, metadata] of Object.entries(tokenMetadata)) {
        allTokens.push({
          symbol: metadata.symbol,
          name: metadata.name,
          coinGeckoId: metadata.coinGeckoId,
          historicalBalance: balances.filter((balance) => balance.tokenAddress === tokenAddress),
        });
      }
      mergePrices(addressStr, allTokens);
    } catch (err) {
      console.log(err);
    }
  };

  const connectSolanaFromWallet = async () => {
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      localStorage.setItem('solanaAddress', addr);

      const pubKey = new solanaWeb3.PublicKey(addr);
      connectSolana(pubKey);
    } catch (err) {
      // error message
      console.log(err);
    }
  };

  const connectSolanaFromInput = async (e: any) => {
    e.preventDefault();
    try {
      const addr = e.target.address.value;
      //TODO: lol this isOnCurve function doesn't even work???
      if (solanaWeb3.PublicKey.isOnCurve(addr)) {
        const pubKey = new solanaWeb3.PublicKey(addr);
        localStorage.setItem('solanaAddress', addr);
        connectSolana(pubKey);
      } else {
        alert('Invalid Sol address');
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('solanaAddress') !== null) {
      const addr: string = String(localStorage.getItem('solanaAddress'));
      const pubKey = new solanaWeb3.PublicKey(addr);

      connectSolana(pubKey);
    }
  }, []);

  return (
    <div>
      {!solanaWallet && (
        <div>
          <Button variant="primary" size="sm" onClick={connectSolanaFromWallet}>
            Connect Phantom
          </Button>
          <form onSubmit={connectSolanaFromInput}>
            <InputGroup size="sm">
              <FormControl type="text" name="address" placeholder="Add Sol address" />
              <Button variant="outline-secondary" type="submit">
                Submit
              </Button>
            </InputGroup>
          </form>
        </div>
      )}
      {solanaWallet && <div>✅ Solana connected </div>}
    </div>
  );
};

export default Solana;
