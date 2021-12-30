import { useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import * as actionTypes from 'src/store/actionTypes';
import {
  accessAccount,
  authCodeAccess,
  createGeminiUrl,
  getHistory,
  refreshTokenAccess,
  storeTokensLocally,
} from 'src/services/gemini';
import { captureMessage } from '@sentry/react';
import { Button } from 'react-bootstrap';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData } from 'src/services/firebase';
import { Balance, Earn, GeminiToCoinGecko, WalletType } from 'src/interfaces/gemini';
import { WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';
import { getUnixTime } from 'date-fns';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';

const coinGeckoTimestamps = getCoinGeckoTimestamps();

const Gemini = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  const user = useContext(AuthContext);

  useEffect(() => {
    const geminiAccessToken = localStorage.getItem('geminiAccessToken');
    const geminiRefreshToken = localStorage.getItem('geminiRefreshToken');

    if (geminiAccessToken && geminiRefreshToken) {
      const access = { geminiAccessToken, geminiRefreshToken };
      if (user) addUserAccessData(user, access);
    }
  }, [user]);

  useEffect(() => {
    const getWalletData = async (wallets: Balance[] | Earn[]) => {
      await Promise.all(
        wallets.map(async (w) => {
          let token: IToken;
          const symbol = w.currency;

          try {
            const rawHistoricalPrices = await getCoinPriceFromName(symbol, symbol);

            const currentPrice = rawHistoricalPrices[rawHistoricalPrices.length - 1][1];
            const lastPrice = rawHistoricalPrices[rawHistoricalPrices.length - 2][1];

            const transactions = await getHistory(localStorage.getItem('geminiAccessToken'));
            const historicalPrices = rawHistoricalPrices.map((historicalPrice) => {
              const timestamp = Math.floor(historicalPrice[0] / 1000);
              const price = historicalPrice[1];
              return { timestamp, price };
            });

            const timestampToGeminiTransaction: GeminiToCoinGecko[] = coinGeckoTimestamps.map(
              (timestamp) => {
                const geminiTransactions = transactions.filter(
                  (txn) =>
                    getUnixTime(new Date(txn.timestampms)) <= timestamp &&
                    txn.currency === w.currency
                );

                const balances = geminiTransactions.reduce(
                  (acc, curr) => (curr.amount ? acc + +curr.amount : acc),
                  0
                );

                return { timestamp, geminiTransactions, balance: balances };
              }
            );

            const balanceTimestamps = timestampToGeminiTransaction.map((p) => p.timestamp);

            const relevantPrices = historicalPrices.filter((p) =>
              balanceTimestamps.includes(p.timestamp)
            );

            const historicalBalance = relevantPrices.map((price) => {
              const pastBalance = timestampToGeminiTransaction.find(
                (txn) => txn.timestamp === price.timestamp
              );

              if (!pastBalance) throw new Error('Timestamp mismatch');

              const timestamp = price.timestamp;
              const balance = pastBalance.balance;
              return { balance, timestamp };
            });

            const historicalWorth = relevantPrices.map((price) => {
              const pastBalance = timestampToGeminiTransaction.find(
                (txn) => txn.timestamp === price.timestamp
              );
              if (!pastBalance) throw new Error('Timestamp mismatch');

              const timestamp = price.timestamp;
              const worth = pastBalance.balance * price.price;
              return { worth, timestamp };
            });

            const currentTimestamp = coinGeckoTimestamps[coinGeckoTimestamps.length - 1];

            relevantPrices.push({ price: currentPrice, timestamp: currentTimestamp });

            if (w.type === WalletType.BALANCE) {
              const wallet = w as Balance;

              historicalWorth.push({
                worth: currentPrice * +parseFloat(wallet.amount),
                timestamp: currentTimestamp,
              });

              token = {
                walletName: WALLETS.GEMINI,
                name: wallet.currency,
                balance: +wallet.amount,
                symbol,
                price: currentPrice,
                lastPrice,
                historicalWorth,
                historicalBalance,
                historicalPrice: relevantPrices,
              };
              dispatch({ type: actionTypes.ADD_ALL_TOKEN, token });
              dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token });
            }
            if (w.type === WalletType.EARN) {
              const wallet = w as Earn;

              historicalWorth.push({
                worth: currentPrice * +parseFloat(String(wallet.available)),
                timestamp: currentTimestamp,
              });

              token = {
                walletName: WALLETS.GEMINI,
                name: wallet.currency,
                balance: +wallet.balance,
                symbol,
                price: currentPrice,
                lastPrice,
                historicalWorth,
                historicalBalance,
                historicalPrice: relevantPrices,
              };
              dispatch({ type: actionTypes.ADD_ALL_TOKEN, token });
              dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token });
            }
          } catch (err) {
            // getting transactions or pricename failed
            captureMessage(`${err}`);
          }
        })
      );
    };

    const geminiInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) return;

      try {
        const geminiAccess = await authCodeAccess(code);

        const accessToken = geminiAccess.access_token;
        storeTokensLocally(geminiAccess);

        const geminiAccount = await accessAccount(accessToken);
        getWalletData(geminiAccount);

        setAuthorized(true);
      } catch (err) {
        captureMessage(`Invalid gemini param code\n${err}`);
      }
    };

    const geminiReauth = async () => {
      try {
        const accountLocal = await accessAccount(localStorage.getItem('geminiAccessToken'));
        getWalletData(accountLocal);
        setAuthorized(true);
      } catch (err) {
        // access token failed
        try {
          const tokenAccess = await refreshTokenAccess(localStorage.getItem('geminiRefreshToken'));

          // refresh local storage
          const accessToken = tokenAccess.access_token;
          storeTokensLocally(tokenAccess);

          const geminiAccount = await accessAccount(accessToken);
          getWalletData(geminiAccount);

          setAuthorized(true);
        } catch (err) {
          // refresh and access token failed
          geminiInitialAuth();
        }
      }
    };

    if (localStorage.getItem('geminiAccessToken') === null) {
      // first time auth
      geminiInitialAuth();
    } else {
      // reauthing
      geminiReauth();
    }
  }, [dispatch]);

  return (
    <div className="App">
      <div>
        {!authorized && (
          <Button variant="primary" size="sm">
            <a href={createGeminiUrl()} style={{ textDecoration: 'none', color: 'white' }}>
              Connect Gemini
            </a>
          </Button>
        )}
      </div>

      {authorized && (
        <div style={{ height: '100%' }}>
          <p>✅ Gemini connected</p>
        </div>
      )}
    </div>
  );
};

export default Gemini;
