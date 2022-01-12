import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { CoinbaseProAccounts, CoinbaseProLedger } from 'src/interfaces/coinbase';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import { WALLETS } from 'src/utils/constants';
import {
  getCoinPriceFromName,
  getHistoricalBalances,
  getHistoricalPrices,
  getHistoricalWorths,
} from 'src/utils/prices';
import { TransactionsCoinGecko } from 'src/interfaces/prices';
import { captureMessage } from '@sentry/react';

export async function getAccountsData(
  apikey: string,
  passphrase: string,
  secret: string
): Promise<CoinbaseProAccounts[]> {
  const query = `https://us-central1-whooshwallet.cloudfunctions.net/api/coinbaseProAccounts?cb_access_key=${apikey}&cb_access_passphrase=${passphrase}&secret=${encodeURIComponent(
    secret
  )}`;

  const response = await axios.get(query);

  return response.data;
}

/**
 * Calculate balances bought and sold in currency & fiat value at purchase price
 * @param txns
 * @param currentPrice
 * @param balance
 * @returns four numbers in number array
 */
// TODO: figure out if the balance and amount are right
export function calculateBalances(
  txns: CoinbaseProLedger[],
  currentPrice: number,
  balance: number
): number[] {
  const totalBalanceBought = txns
    .filter((txn) => +txn.balance > 0)
    .map((txn) => +txn.balance)
    .reduce((acc, curr) => acc + curr, 0);

  const totalFiatBought = txns
    .filter((txn) => +txn.amount > 0)
    .map((txn) => +txn.amount)
    .reduce((acc, curr) => acc + curr, 0);

  const totalBalanceSold = txns
    .filter((txn) => +txn.balance < 0)
    .map((txn) => +txn.balance)
    .concat(-1 * balance)
    .reduce((acc, curr) => acc + curr, 0);

  const totalFiatSold = txns
    .filter((txn) => +txn.amount < 0)
    .map((txn) => +txn.amount)
    .concat(-1 * currentPrice * balance)
    .reduce((acc, curr) => acc + curr, 0);

  return [totalBalanceBought, totalFiatBought, totalBalanceSold, totalFiatSold];
}

/**
 * get wallet data from coinbase pro and get transactions and return conversion into tokens
 * @param wallets
 * @param apikey
 * @param passphrase
 * @param secret
 * @returns IToken list
 */
export async function convertAccountData(
  wallets: CoinbaseProAccounts[],
  apikey: string,
  passphrase: string,
  secret: string
): Promise<IToken[]> {
  const coinGeckoTimestamps = getCoinGeckoTimestamps();

  const completeTokens: IToken[] = (
    await Promise.all(
      wallets
        .filter((wallet) => +parseFloat(wallet.balance) > 0)
        .map(async (wallet) => {
          try {
            const balance = +parseFloat(wallet.balance);
            const symbol = wallet.currency;

            const rawHistoricalPrices = await getCoinPriceFromName(symbol, symbol);

            const currentPrice = rawHistoricalPrices[rawHistoricalPrices.length - 1][1];
            const lastPrice = rawHistoricalPrices[rawHistoricalPrices.length - 2][1];

            const transactions = await getLedger(wallet.id, apikey, passphrase, secret);
            const historicalPrices = getHistoricalPrices(rawHistoricalPrices);

            // current balances bought and sold
            const [totalBalanceBought, totalFiatBought, totalBalanceSold, totalFiatSold] =
              calculateBalances(transactions, currentPrice, balance);

            const timestampTxns: TransactionsCoinGecko[] = coinGeckoTimestamps.map((timestamp) => {
              const accountTransactions = transactions.filter(
                (txn) => getUnixTime(new Date(txn.created_at)) <= timestamp
              );

              const balances = accountTransactions.reduce(
                (acc, curr) => (curr.amount ? acc + +curr.amount : acc),
                0
              );

              return { timestamp, accountTransactions, balance: balances };
            });

            const balanceTimestamps = timestampTxns.map((p) => p.timestamp);
            const relevantPrices = historicalPrices.filter((p) =>
              balanceTimestamps.includes(p.timestamp)
            );

            const historicalBalance = getHistoricalBalances(relevantPrices, timestampTxns);
            const historicalWorth = getHistoricalWorths(relevantPrices, timestampTxns);

            return {
              walletName: WALLETS.COINBASE_PRO,
              balance,
              symbol,
              name: symbol,
              price: currentPrice,
              lastPrice,
              historicalBalance,
              historicalPrice: relevantPrices,
              historicalWorth,
              totalBalanceBought,
              totalFiatBought,
              totalBalanceSold,
              totalFiatSold,
            };
          } catch (e) {
            captureMessage(String(e));
          }
          return null;
        })
    )
  ).filter((token) => token !== null) as IToken[];

  return completeTokens;
}

export async function getLedger(
  walletId: string,
  apikey: string,
  passphrase: string,
  secret: string
): Promise<CoinbaseProLedger[]> {
  const query = `https://us-central1-whooshwallet.cloudfunctions.net/api/coinbaseProLedger?cb_access_key=${apikey}&cb_access_passphrase=${passphrase}&secret=${encodeURIComponent(
    secret
  )}&account_id=${walletId}`;

  const response = await axios.get(query);
  return response.data;
}
