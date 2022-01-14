import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import { coinGeckoList, coinGeckoKeys } from 'src/utils/coinGeckoList';
import Fuse from 'fuse.js';
import { SolanaTokenAccount } from 'src/interfaces/solana';
import {
  BalanceTimestamp,
  CovalentTokenTransaction as CovalentTokenTransactions,
  CovalentTransaction,
  PriceTimestamp,
  TransactionsCoinGecko,
  WorthTimestamp,
} from 'src/interfaces/prices';
import { captureException } from '@sentry/react';
import { mapClosestTimestamp } from './helpers';

const options = { includeScore: true, keys: ['name'], threshold: 1.0 };
const cqtClient = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 4000 });

/**
 * Gets coin name based on slug of coin name + coin symbol (Bitcoin BTC)
 * @param name
 * @param ticker
 * @returns 2D array of coin [timestamp, price]
 */
export const getCoinPriceFromName = async (name: string, ticker: string): Promise<number[][]> => {
  const lowercaseTicker = ticker.toLowerCase();
  const lowercaseName = name.toLowerCase();
  const key = `${lowercaseName}_${lowercaseTicker}`;
  let coinGeckoId = coinGeckoList[key];
  if (coinGeckoId === undefined) {
    const matchingTickers = coinGeckoKeys.filter((token) => token.ticker === lowercaseTicker);
    if (matchingTickers.length === 0) {
      throw new Error(`No matching tickers for ${key}`);
    }
    const fuse = new Fuse(matchingTickers, options);
    const searchResult = fuse.search(lowercaseName);
    if (searchResult.length === 0) {
      // If we only have 1 matching ticker and no search results
      if (matchingTickers.length === 1) {
        coinGeckoId = matchingTickers[0].id;
      } else {
        throw new Error(`No matching coingecko id for ${key}`);
      }
    } else {
      coinGeckoId = searchResult[0].item.id;
    }
  }
  return getCoinPriceFromId(coinGeckoId);
};

/**
 * Queries coingecko based on coingeckoId
 * @param coinGeckoId
 * @returns 2D array [timestamp, price of coin]
 */
export const getCoinPriceFromId = async (coinGeckoId: string): Promise<number[][]> => {
  const response = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=max&interval=minutely`
  );

  if (!response || response.data.length <= 0) {
    throw new Error(`No coingecko price found for coin id: ${coinGeckoId}`);
  }

  return response.data.prices;
};

export const getHistoricalBalanceFromMoralis = async (
  chain: string,
  address: string,
  toBlock: Number
) => {
  axios.defaults.headers.common['X-API-Key'] =
    'PRuHJCXrx3vrV3uHGVplcOZl0IAJg9T7oMiixmUDv5R6RLIs5sJH4AaJQ0h5b5jS';

  const response = await axios.get(
    `https://deep-index.moralis.io/api/v2/${address}/erc20?chain=${chain}&to_block=${toBlock}`
  );

  if (!response) {
    throw new Error(`No erc20: ${address}`);
  }

  return response.data;
};

export const getHistoricalNativeBalanceFromMoralis = async (
  chain: string,
  address: string,
  toBlock: Number
) => {
  axios.defaults.headers.common['X-API-Key'] =
    'PRuHJCXrx3vrV3uHGVplcOZl0IAJg9T7oMiixmUDv5R6RLIs5sJH4AaJQ0h5b5jS';

  const response = await axios.get(
    `https://deep-index.moralis.io/api/v2/${address}/balance?chain=${chain}&to_block=${toBlock}`
  );

  if (!response) {
    throw new Error(`No native ${address}`);
  }

  return response.data;
};

export const getERC20EtherScan = async (address: string) => {
  const response = await axios.get(
    `https://api.etherscan.io/api?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=2702578&page=1&offset=10&sort=asc&apikey=AHDW6XN6KWI3XUKXWE8PWZBKY8AZQ3Q5NA`
  );

  if (!response || response.data.length <= 0) {
    throw new Error(`No erc20 found for coin id: ${address}`);
  }

  return response.data;
};

export const getMoralisDateToBlock = async (chain: string, date: string) => {
  axios.defaults.headers.common['X-API-Key'] =
    'PRuHJCXrx3vrV3uHGVplcOZl0IAJg9T7oMiixmUDv5R6RLIs5sJH4AaJQ0h5b5jS';

  const response = await axios.get(
    `https://deep-index.moralis.io/api/v2/dateToBlock?chain=${chain}&date=${date}`
  );

  if (!response) {
    throw new Error(`No date`);
  }

  return response.data;
};

export const getCovalentHistorical = async (chainId: string, address: string) => {
  const response = await cqtClient.get(
    `https://api.covalenthq.com/v1/${chainId}/address/${address}/portfolio_v2/?quote-currency=USD&format=JSON&key=ckey_4ba288ce83e244e08b26699d5b3`
  );

  if (!response) {
    throw new Error(`No date`);
  }

  return response.data;
};

export const getCovalentTokenTransactions = async (
  chainId: string,
  walletAddress: string,
  tokenAddress: string
): Promise<{ data: CovalentTokenTransactions }> => {
  const response = await cqtClient.get(
    `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/transfers_v2/?contract-address=${tokenAddress}&key=ckey_4ba288ce83e244e08b26699d5b3`
  );

  if (!response) {
    throw new Error(`No date`);
  }

  return response.data;
};

export const getCovalentTransactions = async (
  chainId: string,
  walletAddress: string
): Promise<{ data: CovalentTransaction }> => {
  const response = await cqtClient.get(
    `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/transactions_v2/?key=ckey_4ba288ce83e244e08b26699d5b3`
  );

  if (!response) {
    throw new Error(`No date`);
  }

  return response.data;
};

export const listSolanaTransactions = async (address: string) => {
  const LIMIT = 100;
  let transactions: any[] = [];

  axios.defaults.headers.common['Authorization'] = 'Bearer fd6f3618-ba29-4139-bea4-ad2060d47152';
  let response = await axios.get(
    `https://public-api.solscan.io/account/transactions?account=${address}&limit=${LIMIT}`
  );

  if (!response) {
    throw new Error(`No data`);
  }

  transactions = transactions.concat(response.data);

  // Commented this out cause the pagination can take forever and most people have < 150 txs

  // while (response.data.length === 100) {
  //   const lastHash = transactions[transactions.length - 1].txHash;
  //   response = await axios.get(
  //     `https://public-api.solscan.io/account/transactions?account=${address}&beforeHash=${lastHash}&limit=${LIMIT}`
  //   );

  //   if (!response) {
  //     throw new Error(`No data`);
  //   }

  //   transactions = transactions.concat(response.data);
  // }

  return transactions;
};

export const getSolanaTokenAccounts = async (address: string): Promise<SolanaTokenAccount[]> => {
  const response = await axios.get(
    `https://public-api.solscan.io/account/tokens?account=${address}`
  );

  if (!response) {
    throw new Error(`No date`);
  }

  return response.data;
};

export const getSolanaTransaction = async (txHash: string) => {
  const response = await axios.get(`https://public-api.solscan.io/transaction/${txHash}`);

  if (!response) {
    throw new Error(`No date`);
  }

  return response.data;
};

/**
 * Get historical prices based on coingecko data
 * @param rawHistoricalPrices
 * @returns object with timestamp, price
 */
export const getHistoricalPrices = (rawHistoricalPrices: number[][]): PriceTimestamp[] => {
  return rawHistoricalPrices.map((historicalPrice) => {
    const timestamp = Math.floor(historicalPrice[0] / 1000);
    const price = historicalPrice[1];
    return { timestamp, price };
  });
};

export const getHistoricalBalances = (
  relevantPrices: PriceTimestamp[],
  timestampTxns: TransactionsCoinGecko[]
): BalanceTimestamp[] => {
  const mappedPrices = mapClosestTimestamp(relevantPrices, timestampTxns);
  return mappedPrices.map((price) => {
    const pastBalance = timestampTxns.find((txn) => txn.timestamp === price.timestamp);

    if (!pastBalance) {
      captureException('Timestamp mismatch');
      throw new Error('Timestamp mismatch');
    }

    const timestamp = price.timestamp;
    const balance = pastBalance.balance;
    return { balance, timestamp };
  });
};

export const getHistoricalWorths = (
  relevantPrices: PriceTimestamp[],
  timestampTxns: TransactionsCoinGecko[]
): WorthTimestamp[] => {
  const mappedPrices = mapClosestTimestamp(relevantPrices, timestampTxns);
  return mappedPrices.map((price) => {
    const pastBalance = timestampTxns.find((txn) => txn.timestamp === price.timestamp);
    if (!pastBalance) {
      captureException('Timestamp mismatch');
      throw new Error('Timestamp mismatch');
    }

    const timestamp = price.timestamp;
    const worth = pastBalance.balance * price.price;
    return { worth, timestamp };
  });
};

/**
 * calculate profit loss based on IToken values
 * Average costs and profit/loss is calculated from these four values
 * @param totalBalanceBought
 * @param totalFiatBought
 * @param totalBalanceSold
 * @param totalFiatSold
 */
export const calculateProfitLoss = (
  totalBalanceBought: number,
  totalFiatBought: number,
  totalBalanceSold: number,
  totalFiatSold: number
): number[] => {
  const averageBuyPrice = totalFiatBought / totalBalanceBought;
  const averageSellPrice = totalFiatSold / totalBalanceSold;

  const PL = averageSellPrice - averageBuyPrice;
  const profitLossValue = PL * totalBalanceBought;
  const profitLossRatio = PL / averageBuyPrice;

  return [profitLossValue, profitLossRatio];
};

/**
 * Find the closest price in prices to given timestamp
 * @param prices
 * @param timestamp
 */
export function findClosestPriceFromTime(prices: PriceTimestamp[], timestamp: number): number {
  return prices.reduce(function (prev, curr) {
    return Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp)
      ? curr
      : prev;
  }).price;
}
