import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { CoinbaseProAccounts, CoinbaseProLedger } from 'src/interfaces/coinbase';
import { CoinbaseToCoinGecko } from 'src/interfaces/coinbase';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import { WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';

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

export async function convertAccountData(
  wallets: CoinbaseProAccounts[],
  apikey: string,
  passphrase: string,
  secret: string
): Promise<IToken[] | undefined> {
  const coinGeckoTimestamps = getCoinGeckoTimestamps();

  const completeTokens: IToken[] = await Promise.all(
    wallets
      .filter((wallet) => +parseFloat(wallet.balance) > 0)
      .map(async (wallet) => {
        const balance = +parseFloat(wallet.balance);
        const symbol = wallet.currency;

        const rawHistoricalPrices = await getCoinPriceFromName(symbol, symbol);

        const currentPrice = rawHistoricalPrices[rawHistoricalPrices.length - 1][1];
        const lastPrice = rawHistoricalPrices[rawHistoricalPrices.length - 2][1];

        const transactions = await getLedger(wallet.id, apikey, passphrase, secret);
        const historicalPrices = rawHistoricalPrices.map((historicalPrice) => {
          const timestamp = Math.floor(historicalPrice[0] / 1000);
          const price = historicalPrice[1];
          return { timestamp, price };
        });

        const timestampToCoinbaseTransaction: CoinbaseToCoinGecko[] = coinGeckoTimestamps.map(
          (timestamp) => {
            const coinbaseTransactions = transactions.filter(
              (txn) => getUnixTime(new Date(txn.created_at)) <= timestamp
            );

            const balances = coinbaseTransactions.reduce(
              (acc, curr) => (curr.amount ? acc + +curr.amount : acc),
              0
            );

            return { timestamp, coinbaseTransactions, balance: balances };
          }
        );

        const balanceTimestamps = timestampToCoinbaseTransaction.map((p) => p.timestamp);

        const relevantPrices = historicalPrices.filter((p) =>
          balanceTimestamps.includes(p.timestamp)
        );

        const historicalBalance = relevantPrices.map((price) => {
          const pastBalance = timestampToCoinbaseTransaction.find(
            (txn) => txn.timestamp === price.timestamp
          );

          if (!pastBalance) throw new Error('Timestamp mismatch');

          const timestamp = price.timestamp;
          const balance = pastBalance.balance;
          return { balance, timestamp };
        });

        const historicalWorth = relevantPrices.map((price) => {
          const pastBalance = timestampToCoinbaseTransaction.find(
            (txn) => txn.timestamp === price.timestamp
          );
          if (!pastBalance) throw new Error('Timestamp mismatch');

          const timestamp = price.timestamp;
          const worth = pastBalance.balance * price.price;
          return { worth, timestamp };
        });

        const currentTimestamp = coinGeckoTimestamps[coinGeckoTimestamps.length - 1];

        relevantPrices.push({ price: currentPrice, timestamp: currentTimestamp });

        historicalWorth.push({
          worth: currentPrice * +parseFloat(wallet.balance),
          timestamp: currentTimestamp,
        });

        const completeToken = {
          walletName: WALLETS.COINBASE_PRO,
          balance,
          symbol,
          name: symbol,
          price: currentPrice,
          lastPrice,
          historicalBalance,
          historicalPrice: relevantPrices,
          historicalWorth,
        };

        return completeToken;
      })
  );

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
