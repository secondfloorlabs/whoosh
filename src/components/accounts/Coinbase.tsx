import { useContext, useEffect, useState } from 'react';
import { captureMessage } from '@sentry/react';
import { useDispatch } from 'react-redux';
import { Button } from 'react-bootstrap';

import { WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';
import * as actionTypes from 'src/store/actionTypes';

import {
  createCoinbaseUrl,
  accessAccount,
  authCodeAccess,
  storeTokensLocally,
  refreshTokenAccess,
  getTransactions,
} from 'src/services/coinbase';

import { CoinbaseToCoinGecko, CoinbaseWallet } from 'src/interfaces/coinbase';
import { getUnixTime } from 'date-fns';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData, getUserData, getUserMetadata } from 'src/services/firebase';

const coinGeckoTimestamps = getCoinGeckoTimestamps();

const Coinbase = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  // const [storedWallets, setStoredWallets] = useState<CoinbaseWallet[]>([]);
  const user = useContext(AuthContext);
  const [loading, setLoading] = useState<Boolean>(true);

  // useEffect(() => {
  //   const coinbaseAccessToken = localStorage.getItem('coinbaseAccessToken');
  //   const coinbaseRefreshToken = localStorage.getItem('coinbaseRefreshToken');

  //   if (coinbaseAccessToken && coinbaseRefreshToken) {
  //     const access = { coinbaseAccessToken, coinbaseRefreshToken };
  //     if (user) addUserAccessData(user, access);
  //   }
  // }, [user]);

  /**
   * This useEffect runs on inital auth, without any access token in local storage
   * Once access/refresh token exists, this runs through separate reauth check
   */
  useEffect(() => {
    const getWalletData = async (wallets: CoinbaseWallet[]) => {
      // map coinbase wallets with positive balances to tokens
      await Promise.all(
        wallets
          .filter((wallet) => +parseFloat(wallet.balance.amount) > 0)
          .map(async (wallet) => {
            const balance = +parseFloat(wallet.balance.amount);
            const symbol = wallet.currency.code;
            const name = wallet.currency.name;

            try {
              const rawHistoricalPrices = await getCoinPriceFromName(name, symbol);

              const currentPrice = rawHistoricalPrices[rawHistoricalPrices.length - 1][1];
              const lastPrice = rawHistoricalPrices[rawHistoricalPrices.length - 2][1];

              const transactions = await getTransactions(wallet.id);
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
                    (acc, curr) => (curr.amount.amount ? acc + +curr.amount.amount : acc),
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
                worth: currentPrice * +parseFloat(wallet.balance.amount),
                timestamp: currentTimestamp,
              });

              const completeToken: IToken = {
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

              dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
              dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });
            } catch (e) {
              // getting transactions or pricename failed
              captureMessage(`${e}`);
            }
          })
      );
    };

    const coinbaseInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) {
        if (user) {
          // firebase logged in
          const userMetadata = await getUserMetadata(user);

          // store user tokens in localstorage for multiple device sync
          if (userMetadata) {
            const coinbaseAccessToken = userMetadata.access.coinbaseAccessToken;
            const coinbaseRefreshToken = userMetadata.access.coinbaseRefreshToken;
            localStorage.setItem('coinbaseAccessToken', coinbaseAccessToken);
            localStorage.setItem('coinbaseRefreshToken', coinbaseRefreshToken);
          }

          // retrieve stored wallet data
          const wallets = (await getUserData(user, 'coinbase')) as CoinbaseWallet[];
          getWalletData(wallets);
        }
      } else {
        try {
          const coinbaseAccess = await authCodeAccess(code);
          const accessToken = coinbaseAccess.access_token;
          storeTokensLocally(coinbaseAccess);
          const access = {
            coinbaseAccessToken: accessToken,
            coinbaseRefreshToken: coinbaseAccess.refresh_token,
          };
          if (user) addUserAccessData(user, access);

          const coinbaseAccount = await accessAccount(accessToken);
          const wallets = coinbaseAccount.reverse(); // primary wallet (BTC) top of list
          getWalletData(wallets);
        } catch (err) {
          captureMessage(`Invalid coinbase param code\n${err}`);
        }
      }
      setAuthorized(true);
    };

    const coinbaseReauth = async () => {
      try {
        if (user) {
          // firebase logged in
          const userMetadata = await getUserMetadata(user);

          // store user tokens in localstorage for multiple device sync
          if (userMetadata) {
            const coinbaseAccessToken = userMetadata.access.coinbaseAccessToken;
            const coinbaseRefreshToken = userMetadata.access.coinbaseRefreshToken;
            localStorage.setItem('coinbaseAccessToken', coinbaseAccessToken);
            localStorage.setItem('coinbaseRefreshToken', coinbaseRefreshToken);
          }

          // retrieve stored wallet data
          const wallets = (await getUserData(user, 'coinbase')) as CoinbaseWallet[];
          getWalletData(wallets);
        } else {
          // not firebase logged in
          const accountLocal = await accessAccount(localStorage.getItem('coinbaseAccessToken'));
          const wallets = accountLocal.reverse(); // primary (BTC) wallet is on top of list

          getWalletData(wallets);
        }

        setAuthorized(true);
      } catch (err) {
        // access token failed
        try {
          const tokenAccess = await refreshTokenAccess();

          // refresh local storage
          const accessToken = tokenAccess.access_token;
          storeTokensLocally(tokenAccess);
          const access = {
            coinbaseAccessToken: accessToken,
            coinbaseRefreshToken: tokenAccess.refresh_token,
          };
          if (user) addUserAccessData(user, access);

          const coinbaseAccount = await accessAccount(accessToken);

          if (coinbaseAccount) {
            const wallets = coinbaseAccount.reverse();
            getWalletData(wallets);
            setAuthorized(true);
          }
        } catch (err) {
          // refresh and access token failed
          coinbaseInitialAuth();
        }
      }
    };

    if (localStorage.getItem('coinbaseAccessToken') === null) {
      // first time auth
      coinbaseInitialAuth();
    } else {
      // reauthing
      if (user === undefined) {
        // not logged into firebase
        setLoading(false);
        coinbaseReauth();
      } else if (user === null) {
        // loading state
      } else {
        // logged into firebase
        setLoading(false);
        coinbaseReauth();
      }
    }
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="App">
      <div>
        {!authorized && (
          <Button variant="primary" size="sm">
            <a href={createCoinbaseUrl()} style={{ textDecoration: 'none', color: 'white' }}>
              Connect Coinbase
            </a>
          </Button>
        )}
      </div>

      {authorized && !loading && (
        <div style={{ height: '100%' }}>
          <p>✅ Coinbase connected</p>
        </div>
      )}
    </div>
  );
};

export default Coinbase;
