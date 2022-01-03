import axios from 'axios';
import { LINKS, WALLETS } from 'src/utils/constants';
import { isProduction, getCoinGeckoTimestamps } from 'src/utils/helpers';
import {
  Balance,
  Earn,
  GeminiAccessResponse,
  GeminiToCoinGecko,
  Transfer,
  WalletType,
} from 'src/interfaces/gemini';
import { getCoinPriceFromName } from 'src/utils/prices';
import { getUnixTime } from 'date-fns';
import { captureMessage } from '@sentry/react';

export const GEMINI_AUTH_URL = 'https://exchange.gemini.com';
export const GEMINI_API_URL = 'https://api.gemini.com';

export const GEMINI_AUTH = {
  client_id: '61c7adff-a5df-4dad-8dbc-63ac58372dc5',
  client_secret: '61c7adff-f7e6-493f-bbf9-9c25240a8e65',
  response_type: 'code',
  scope:
    'addresses:read,history:read,account:read,orders:read,payments:read,balances:read,banks:read',
};

export const createGeminiUrl = (): string => {
  const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;

  const url = `${GEMINI_AUTH_URL}/auth?client_id=${GEMINI_AUTH.client_id}&response_type=${GEMINI_AUTH.response_type}&redirect_uri=${redirect_uri}&state=82350325&scope=${GEMINI_AUTH.scope}`;

  return url;
};

export async function authCodeAccess(code: string): Promise<GeminiAccessResponse> {
  const query = `https://us-central1-whooshwallet.cloudfunctions.net/api/geminiAuth?code=${code}`;
  const response = await axios.get(query);
  return response.data;
}

export async function refreshTokenAccess(
  refreshToken: string | null
): Promise<GeminiAccessResponse> {
  const query = `https://us-central1-whooshwallet.cloudfunctions.net/api/geminiRefresh?refresh_token=${refreshToken}`;
  const response = await axios.get(query);
  return response.data;
}

export async function accessAccount(accessToken: string | null): Promise<Balance[] | Earn[]> {
  const query = `https://us-central1-whooshwallet.cloudfunctions.net/api/geminiAccounts?access_token=${accessToken}`;
  const response = await axios.get(query);
  return response.data;
}

export const storeTokensLocally = (access: GeminiAccessResponse): void => {
  localStorage.setItem('geminiAccessToken', access.access_token);
  localStorage.setItem('geminiRefreshToken', access.refresh_token);
};

export async function getHistory(accessToken: string | null): Promise<Transfer[]> {
  const query = `https://us-central1-whooshwallet.cloudfunctions.net/api/geminiHistory?access_token=${accessToken}`;
  const response = await axios.get(query);
  return response.data;
}

// export async function convertAccountData(wallets: Balance[] | Earn[]): Promise<IToken[]> {
//   const coinGeckoTimestamps = getCoinGeckoTimestamps();

//   const completeTokens = await Promise.all(
//     wallets.map(async (w) => {
//       const symbol = w.currency;

//       let rawHistoricalPrices: number[][] = [];
//       let transactions: Transfer[] = [];

//       try {
//         rawHistoricalPrices = await getCoinPriceFromName(symbol, symbol);
//       } catch (err) {
//         captureMessage(String(err));
//       }

//       try {
//         transactions = await getHistory(localStorage.getItem('geminiAccessToken'));
//       } catch (err) {
//         captureMessage(String(err));
//       }

//       const currentPrice = rawHistoricalPrices[rawHistoricalPrices.length - 1][1];
//       const lastPrice = rawHistoricalPrices[rawHistoricalPrices.length - 2][1];

//       const historicalPrices = rawHistoricalPrices.map((historicalPrice) => {
//         const timestamp = Math.floor(historicalPrice[0] / 1000);
//         const price = historicalPrice[1];
//         return { timestamp, price };
//       });

//       const timestampToGeminiTransaction: GeminiToCoinGecko[] = coinGeckoTimestamps.map(
//         (timestamp) => {
//           const geminiTransactions = transactions.filter(
//             (txn) =>
//               getUnixTime(new Date(txn.timestampms)) <= timestamp && txn.currency === w.currency
//           );

//           const balances = geminiTransactions.reduce(
//             (acc, curr) => (curr.amount ? acc + +curr.amount : acc),
//             0
//           );

//           return { timestamp, geminiTransactions, balance: balances };
//         }
//       );

//       const balanceTimestamps = timestampToGeminiTransaction.map((p) => p.timestamp);

//       const relevantPrices = historicalPrices.filter((p) =>
//         balanceTimestamps.includes(p.timestamp)
//       );

//       const historicalBalance = relevantPrices.map((price) => {
//         const pastBalance = timestampToGeminiTransaction.find(
//           (txn) => txn.timestamp === price.timestamp
//         );

//         if (!pastBalance) throw new Error('Timestamp mismatch');

//         const timestamp = price.timestamp;
//         const balance = pastBalance.balance;
//         return { balance, timestamp };
//       });

//       const historicalWorth = relevantPrices.map((price) => {
//         const pastBalance = timestampToGeminiTransaction.find(
//           (txn) => txn.timestamp === price.timestamp
//         );
//         if (!pastBalance) throw new Error('Timestamp mismatch');

//         const timestamp = price.timestamp;
//         const worth = pastBalance.balance * price.price;
//         return { worth, timestamp };
//       });

//       const currentTimestamp = coinGeckoTimestamps[coinGeckoTimestamps.length - 1];

//       relevantPrices.push({ price: currentPrice, timestamp: currentTimestamp });

//       if (w.type === WalletType.BALANCE) {
//         const wallet = w as Balance;

//         historicalWorth.push({
//           worth: currentPrice * +parseFloat(wallet.amount),
//           timestamp: currentTimestamp,
//         });

//         const token = {
//           walletName: WALLETS.GEMINI,
//           name: wallet.currency,
//           balance: +wallet.amount,
//           symbol,
//           price: currentPrice,
//           lastPrice,
//           historicalWorth,
//           historicalBalance,
//           historicalPrice: relevantPrices,
//         };
//         return token;
//       } else {
//         const wallet = w as Earn;

//         historicalWorth.push({
//           worth: currentPrice * +parseFloat(String(wallet.available)),
//           timestamp: currentTimestamp,
//         });

//         const token = {
//           walletName: WALLETS.GEMINI,
//           name: wallet.currency,
//           balance: +wallet.balance,
//           symbol,
//           price: currentPrice,
//           lastPrice,
//           historicalWorth,
//           historicalBalance,
//           historicalPrice: relevantPrices,
//         };
//         return token;
//       }
//     })
//   );

//   return completeTokens;
// }
