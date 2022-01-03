import { useState, useEffect, useContext } from 'react';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { captureMessage } from '@sentry/react';
import * as solanaWeb3 from '@solana/web3.js';
import * as actionTypes from 'src/store/actionTypes';

import { getCoinPriceFromId, getSolanaTokenAccounts } from 'src/utils/prices';
import { WALLETS, NETWORKS, LOCAL_STORAGE_KEYS, SOL_PER_LAMPORT } from 'src/utils/constants';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import { mapClosestTimestamp } from 'src/utils/helpers';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData } from 'src/services/firebase';
import {
  SolanaTransaction,
  SplToken,
  StakedAccount,
  TokenBalance,
  TokenMetadata,
} from 'src/interfaces/solana';
import {
  getDetailedTxs,
  getSolanaStakeAccounts,
  NATIVE_TOKEN,
  STAKED_SOL,
} from 'src/services/solana';
import { SPL_TOKENS } from 'src/utils/solanaCoinList';

const coinGeckoTimestamps = getCoinGeckoTimestamps();
const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');

const Solana = () => {
  const dispatch = useDispatch();
  const [solanaWallet, setSolanaWallet] = useState(false);
  const [walletsConnected, setWalletsConnected] = useState<string[]>([]);
  const user = useContext(AuthContext);

  useEffect(() => {
    const solanaAddress = localStorage.getItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES);

    if (solanaAddress) {
      const access = { solanaAddress };
      if (user) addUserAccessData(user, access);
    }
  }, [user]);

  const getTokenMetadata = (
    tokenAccounts: { mint: { address: string } }[],
    stakedAccounts: string[]
  ): TokenMetadata => {
    const tokenMetadata: TokenMetadata = {};
    tokenMetadata['native'] = NATIVE_TOKEN;

    tokenAccounts.forEach((account) => {
      const splToken = SPL_TOKENS.find((token) => token.publicKey === account.mint.address);
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
    solTokenAccounts: string[],
    stakedAccounts: string[]
  ): { [tokenAddress: string]: number } => {
    let tokenBalances: { [tokenAddress: string]: number } = {};
    for (let transaction of transactionsAtPriceTimestamp) {
      const nativeAccountIndex = transaction.accounts.findIndex(
        (account: string) => account === address
      );
      tokenBalances['native'] = transaction.meta.postBalances[nativeAccountIndex] * SOL_PER_LAMPORT;

      stakedAccounts.forEach((stakedAccount) => {
        const stakedAccountIndex = transaction.accounts.findIndex(
          (account) => account === stakedAccount
        );
        if (stakedAccountIndex !== -1) {
          tokenBalances[stakedAccount] =
            transaction.meta.postBalances[stakedAccountIndex] * SOL_PER_LAMPORT;
        }
      });

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
    const solTransactions = await getDetailedTxs(address, stakedAccounts, connection);

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
        solTokenAccounts,
        stakedAccounts
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
          walletName: WALLETS.PHANTOM,
          balance: currentBalance,
          symbol: token.symbol,
          name: token.name,
          network: NETWORKS.SOLANA,
          walletAddress: address,
          price: currentPrice,
          lastPrice,
          historicalBalance: historicalBalances,
          historicalPrice: relevantPrices,
          historicalWorth,
        };
        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      } catch (e) {
        captureMessage(String(e));
        const completeToken: IToken = {
          walletName: WALLETS.PHANTOM,
          balance: currentBalance,
          symbol: token.symbol,
          name: token.name,
          network: NETWORKS.SOLANA,
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
            network: NETWORKS.SOLANA,
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
    const historicalPrices = await getCoinPriceFromId(NETWORKS.SOLANA);
    price = historicalPrices[historicalPrices.length - 1][1];
    lastPrice = historicalPrices[historicalPrices.length - 2][1];

    return { balance: sol, price, lastPrice };
  };

  const connectSolana = async (pubKeys: string[]) => {
    setSolanaWallet(true);
    setWalletsConnected(pubKeys);

    // Current worth
    for (let pubKey of pubKeys) {
      const address = new solanaWeb3.PublicKey(pubKey);
      let stakedAccounts: StakedAccount[] = [];
      try {
        const { balance, price, lastPrice } = await getCurrentSolWorth(address);

        const solToken: IToken = {
          walletAddress: address.toString(),
          walletName: WALLETS.PHANTOM,
          network: NETWORKS.SOLANA,
          symbol: NATIVE_TOKEN.symbol,
          name: NATIVE_TOKEN.name,
          balance,
          price,
          lastPrice,
        };
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: solToken });

        stakedAccounts = await getSolanaStakeAccounts(address.toString());
        for (let stakedAccount of stakedAccounts) {
          const solToken: IToken = {
            walletAddress: stakedAccount.address,
            walletName: WALLETS.PHANTOM,
            network: NETWORKS.SOLANA,
            balance: stakedAccount.balance,
            symbol: STAKED_SOL.symbol,
            name: STAKED_SOL.name,
            price,
            lastPrice,
          };

          dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: solToken });
        }
      } catch (e) {
        captureMessage(`Failed to get current SOL accounts ${e}`);
      }

      SPL_TOKENS.forEach(async (splToken) => {
        addCurrentSplTokenWorth(splToken, address);
      });
    }

    // Historical worth
    for (let pubKey of pubKeys) {
      try {
        const stakedAccounts = await getSolanaStakeAccounts(pubKey);
        const stakedAccountAddresses = stakedAccounts.map((account) => account.address);
        const { balances, tokenMetadata } = await getHistoricalBalances(
          pubKey,
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
        mergePrices(pubKey, allTokens);
      } catch (err) {
        captureMessage(String(err));
      }
    }
  };

  const getNewSolanaAddresses = (newAddress: string): string[] => {
    const storedAddresses = localStorage.getItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES);

    let newKeys: string[] = [];
    if (!storedAddresses) {
      newKeys = [newAddress];
    } else {
      const prevAddresses = JSON.parse(storedAddresses);
      if (!prevAddresses.includes(newAddress)) {
        newKeys = [...prevAddresses, newAddress];
      }
    }
    return newKeys;
  };

  const connectSolanaFromWallet = async () => {
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      const newKeys: string[] = getNewSolanaAddresses(addr);
      localStorage.setItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES, JSON.stringify(newKeys));
      connectSolana(newKeys);
    } catch (err) {
      captureMessage(String(err));
    }
  };

  const connectSolanaFromInput = async (e: any) => {
    e.preventDefault();
    try {
      const addr = e.target.address.value;
      if (solanaWeb3.PublicKey.isOnCurve(addr)) {
        const pubKey = new solanaWeb3.PublicKey(addr).toString();
        const newKeys: string[] = getNewSolanaAddresses(pubKey);
        localStorage.setItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES, JSON.stringify(newKeys));
        connectSolana(newKeys);
      } else {
        alert('Invalid Sol address');
      }
    } catch (err) {
      captureMessage(String(err));
    }
  };

  useEffect(() => {
    const storedAddresses = localStorage.getItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES);
    if (storedAddresses !== null) {
      const addresses: string[] = JSON.parse(storedAddresses);

      connectSolana(addresses);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div>
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

      {solanaWallet && <div>✅ Solana wallets connected: {walletsConnected.length} </div>}
    </div>
  );
};

export default Solana;
