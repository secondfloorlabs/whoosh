import axios, { AxiosResponse } from 'axios';
import { LINKS, LOCAL_STORAGE_KEYS, WALLETS } from 'src/utils/constants';
import { isProduction } from 'src/utils/helpers';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import {
  CoinbaseAccessResponse,
  CoinbaseTransactionsComplete,
  CoinbaseWallet,
} from 'src/interfaces/coinbase';
import {
  getCoinPriceFromName,
  getHistoricalBalances,
  getHistoricalPrices,
  getHistoricalWorths,
} from 'src/utils/prices';
import { getUnixTime } from 'date-fns';
import { captureMessage } from '@sentry/react';
import { TransactionsCoinGecko } from 'src/interfaces/prices';
import { User } from 'firebase/auth';
import { addUserAccessData } from 'src/services/firebase';

export const coinbaseApiUrl = 'https://api.coinbase.com';

export const COINBASE_AUTH = {
  client_id: '8ad3a3e1c85af0f56ee3f305b4930a67d8b126df89504c53ae871731ed186a2a',
  client_secret: 'ce0e6c99fc27c887ae42b9fa212bf12678cd329ba1330a32849ef738b8c40af8',
  response_type: 'code',
  scope: 'wallet:user:read wallet:accounts:read wallet:transactions:read wallet:addresses:read',
  authorizeUrl: 'https://www.coinbase.com/oauth/authorize',
  oauthTokenUrl: `https://api.coinbase.com/oauth/token`,
  accountsUrl: 'https://api.coinbase.com/v2/accounts?limit=100',
  grant_type: 'authorization_code',
  account: 'all',
};

export const createCoinbaseUrl = (): string => {
  const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;
  const url = `${COINBASE_AUTH.authorizeUrl}?client_id=${COINBASE_AUTH.client_id}&redirect_uri=${redirect_uri}&response_type=${COINBASE_AUTH.response_type}&scope=${COINBASE_AUTH.scope}&account=${COINBASE_AUTH.account}`;
  return encodeURI(url);
};

export async function accessAccount(
  token: string | null,
  nextUri?: string
): Promise<CoinbaseWallet[]> {
  // get user data
  const query = nextUri ? `${coinbaseApiUrl}${nextUri}` : `${COINBASE_AUTH.accountsUrl}`;

  const response: AxiosResponse = await axios.get(query, {
    headers: { Authorization: `Bearer ${token}`, 'CB-Version': '2021-04-10' },
  });

  const data = response.data;

  // pagination
  if (data.pagination.next_uri) {
    return data.data.concat(await accessAccount(token, data.pagination.next_uri));
  } else {
    return data.data;
  }
}

export async function authCodeAccess(code: string): Promise<CoinbaseAccessResponse> {
  const response: AxiosResponse<CoinbaseAccessResponse> = await axios.post(
    COINBASE_AUTH.oauthTokenUrl,
    {
      grant_type: COINBASE_AUTH.grant_type,
      code,
      client_id: COINBASE_AUTH.client_id,
      client_secret: COINBASE_AUTH.client_secret,
      redirect_uri: isProduction() ? LINKS.baseURL : LINKS.localURL,
    }
  );
  return response.data;
}

export async function refreshTokenAccess(): Promise<CoinbaseAccessResponse> {
  const response: AxiosResponse<CoinbaseAccessResponse> = await axios.post(
    COINBASE_AUTH.oauthTokenUrl,
    {
      grant_type: 'refresh_token',
      client_id: COINBASE_AUTH.client_id,
      client_secret: COINBASE_AUTH.client_secret,
      refresh_token: localStorage.getItem('coinbaseRefreshToken'),
    }
  );
  return response.data;
}

export const storeTokensLocally = (access: CoinbaseAccessResponse): void => {
  const coinbaseAccessToken = access.access_token;
  const coinbaseRefreshToken = access.refresh_token;

  localStorage.setItem(LOCAL_STORAGE_KEYS.COINBASE_ACCESS_TOKEN, coinbaseAccessToken);
  localStorage.setItem(LOCAL_STORAGE_KEYS.COINBASE_REFRESH_TOKEN, coinbaseRefreshToken);
};

export async function getTransactions(
  walletId: string,
  nextUri?: string
): Promise<CoinbaseTransactionsComplete[]> {
  const query = nextUri
    ? `${coinbaseApiUrl}${nextUri}`
    : `${coinbaseApiUrl}/v2/accounts/${walletId}/transactions?limit=100`;

  const response: AxiosResponse = await axios.get(query, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem(LOCAL_STORAGE_KEYS.COINBASE_ACCESS_TOKEN)}`,
      'CB-Version': '2021-04-10',
    },
  });

  const data = response.data;

  // pagination
  if (data.pagination.next_uri) {
    return data.data.concat(await getTransactions(walletId, data.pagination.next_uri));
  } else {
    return data.data;
  }
}

/**
 * get wallet data from coinbase and get transactions and return conversion into tokens
 * @param wallets
 * @returns list of ITokens to store in redux
 */
export async function convertAccountData(
  wallets: CoinbaseWallet[],
  user?: User | null
): Promise<IToken[]> {
  const coinGeckoTimestamps = getCoinGeckoTimestamps();
  // coinGeckoTimestamps.push(Date.now());

  const completeTokens: IToken[] = await Promise.all(
    // map coinbase wallets with positive balances to tokens
    await Promise.all(
      wallets
        .filter((wallet) => +parseFloat(wallet.balance.amount) > 0)
        .map(async (wallet) => {
          const balance = +parseFloat(wallet.balance.amount);
          const symbol = wallet.currency.code;
          const name = wallet.currency.name;
          let rawHistoricalPrices: number[][] = [];

          try {
            rawHistoricalPrices = await getCoinPriceFromName(name, symbol);
          } catch (err) {
            captureMessage(String(err));
          }

          let transactions: CoinbaseTransactionsComplete[] = [];

          try {
            // check if transactions works for any wallet
            transactions = await getTransactions(wallet.id);
          } catch (err) {
            const tokenAccess = await refreshTokenAccess();

            // refresh local storage
            const coinbaseAccessToken = tokenAccess.access_token;
            const coinbaseRefreshToken = tokenAccess.refresh_token;

            storeTokensLocally(tokenAccess);
            if (user) {
              const access = { coinbaseAccessToken, coinbaseRefreshToken };
              addUserAccessData(user, access);
            }

            transactions = await getTransactions(wallet.id);
            captureMessage(String(err));
          }

          console.log(transactions);
          const totalBalances = transactions
            .filter((transaction) => +transaction.amount.amount > 0)
            .map((transaction) => {
              return +transaction.amount.amount;
            });

          const nativeAmounts = transactions
            .filter((transaction) => +transaction.amount.amount > 0)
            .map((transaction) => {
              return +transaction.native_amount.amount;
            });

          const currentPrice = rawHistoricalPrices[rawHistoricalPrices.length - 1][1];

          console.log(balance);
          const totalSellBalances = transactions
            .filter((transaction) => +transaction.amount.amount < 0)
            .map((transaction) => {
              return +transaction.amount.amount;
            });
          totalSellBalances.push(-1 * balance);

          const nativeSellAmounts = transactions
            .filter((transaction) => +transaction.amount.amount < 0)
            .map((transaction) => {
              return +transaction.native_amount.amount;
            });
          nativeSellAmounts.push(-1 * currentPrice * balance);

          console.log(totalBalances);
          console.log(nativeAmounts);
          const totalBalanceAmount = totalBalances.reduce((acc, curr) => acc + curr, 0);
          const nativeAmount = nativeAmounts.reduce((acc, curr) => acc + curr, 0);
          const totalSellBalanceAmount = totalSellBalances.reduce((acc, curr) => acc + curr, 0);
          const nativeSellAmount = nativeSellAmounts.reduce((acc, curr) => acc + curr, 0);

          console.log(wallet.name);

          console.log(`totalBalanceAmount`, totalBalanceAmount);
          console.log(`nativeAmount`, nativeAmount);
          console.log(`totalSellBalanceAmount`, totalSellBalanceAmount);
          console.log(`nativeSellAmount`, nativeSellAmount);

          const averageBuyPrice = nativeAmount / totalBalanceAmount;
          const averageSellPrice = nativeSellAmount / totalSellBalanceAmount;
          console.log('averageBuyPrice', averageBuyPrice);
          console.log('averageSellPrice', averageSellPrice);

          const PL = averageSellPrice - averageBuyPrice;

          console.log('Profit/Loss', PL / averageBuyPrice);

          const lastPrice = rawHistoricalPrices[rawHistoricalPrices.length - 2][1];
          const historicalPrices = getHistoricalPrices(rawHistoricalPrices);

          const timestampTxns: TransactionsCoinGecko[] = coinGeckoTimestamps.map((timestamp) => {
            const accountTransactions = transactions.filter(
              (txn) => getUnixTime(new Date(txn.created_at)) <= timestamp
            );

            const balances = accountTransactions.reduce(
              (acc, curr) => (curr.amount.amount ? acc + +curr.amount.amount : acc),
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
            walletName: WALLETS.COINBASE,
            balance,
            symbol,
            name: wallet.currency.name,
            price: currentPrice,
            lastPrice,
            historicalBalance,
            historicalPrice: relevantPrices,
            historicalWorth,
          };
        })
    )
  );
  return completeTokens;
}
