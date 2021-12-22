import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';
import * as actionTypes from 'src/store/actionTypes';

import {
  createCoinbaseUrl,
  receiveCoinbasePriceData,
  accessAccount,
  authCodeAccess,
  storeTokensLocally,
  refreshTokenAccess,
  getTransactions,
} from 'src/services/coinbase';

import { CoinbaseWallet } from 'src/services/coinbaseTypes';
import { getUnixTime } from 'date-fns';

const Coinbase = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);

  /**
   * 1) gets query param, checks if local storage is undefined, so should only run once - runs on every component did mount
   * 2) runs on every component mount, checks if localstorage exists, tries it - if expired, then reauth with refresh token
   */
  useEffect(() => {
    const getWalletData = async (wallets: CoinbaseWallet[]) => {
      // map coinbase wallets with positive balances to tokens
      await Promise.all(
        wallets
          .filter((wallet) => +parseFloat(wallet.balance.amount) > 0)
          .map(async (wallet) => {
            const coinPrice = await receiveCoinbasePriceData(wallet.balance.currency);
            let price = +parseFloat(coinPrice); // tried to do it 1-liner
            const balance = +parseFloat(wallet.balance.amount);
            const symbol = wallet.currency.code;
            let lastPrice = 0;

            try {
              const historicalPrices = await getCoinPriceFromName(
                wallet.currency.name,
                wallet.currency.code
              );
              // TODO: Add historical price to redux
              const coinGeckoPrice = historicalPrices[historicalPrices.length - 1][1];
              lastPrice = historicalPrices[historicalPrices.length - 2][1];
              price = coinGeckoPrice;
            } catch (e) {
              console.error(e);
            }

            // console.log(wallet.name, wallet.id);

            const transactions = await getTransactions(wallet.id);
            const historicalBalances: { balance: number; timestamp: number }[] = [];
            const historicalPrices: { price: number; timestamp: number }[] = [];
            const historicalWorth: { worth: number; timestamp: number }[] = [];

            transactions.data.map((transaction) => {
              const transactionAmount = parseInt(transaction.amount.amount, 10);
              const transactionNativeAmount = parseInt(transaction.native_amount.amount, 10);

              const price = transactionNativeAmount / transactionAmount;
              const unixTime = new Date(transaction.created_at);
              historicalPrices.push({ price, timestamp: getUnixTime(unixTime) });
              historicalBalances.push({
                balance: transactionAmount,
                timestamp: getUnixTime(unixTime),
              });
              console.log(transactionAmount);
              historicalWorth.push({ worth: transactionAmount, timestamp: getUnixTime(unixTime) });
            });

            const token: IToken = {
              walletName: WALLETS.COINBASE,
              balance,
              symbol,
              name: wallet.currency.name,
              price,
              lastPrice,
              historicalBalance: historicalBalances,
              historicalPrice: historicalPrices,
              historicalWorth,
            };

            dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: token });
          })
      );
    };

    const coinbaseInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) return;

      try {
        const coinbaseAccess = await authCodeAccess(code);

        const accessToken = coinbaseAccess.access_token;
        storeTokensLocally(coinbaseAccess);

        const coinbaseAccount = await accessAccount(accessToken);

        const wallets: CoinbaseWallet[] = coinbaseAccount.data.reverse(); // primary wallet (BTC) top of list
        getWalletData(wallets);
        setAuthorized(true);
      } catch (err) {
        // missing or invalid codebase query param code
        console.log(err);
      }
    };

    const coinbaseReauth = async () => {
      try {
        const accountLocal = await accessAccount(localStorage.getItem('coinbaseAccessToken'));
        // primary (BTC) wallet is on top of list
        const wallets: CoinbaseWallet[] = accountLocal.data.reverse();
        getWalletData(wallets);
        setAuthorized(true);
      } catch (err) {
        console.log('access token failed');
        try {
          const tokenAccess = await refreshTokenAccess();

          // refresh local storage
          const accessToken = tokenAccess.access_token;
          storeTokensLocally(tokenAccess);

          const coinbaseAccount = await accessAccount(accessToken);

          if (coinbaseAccount) {
            const wallets: CoinbaseWallet[] = coinbaseAccount.data.reverse();
            getWalletData(wallets);
            setAuthorized(true);
          }
        } catch (err) {
          console.log('refresh and access failed');
          coinbaseInitialAuth();
        }
      }
    };

    if (localStorage.getItem('coinbaseAccessToken') === null) {
      console.log('first time auth');
      coinbaseInitialAuth();
    } else {
      console.log('reauthing');
      coinbaseReauth();
    }
  }, [dispatch]);

  return (
    <div className="App">
      <div>
        {!authorized && (
          <button>
            <a href={createCoinbaseUrl()}>Connect Coinbase</a>
          </button>
        )}
      </div>

      {authorized && (
        <div style={{ height: '100%' }}>
          <p>✅ Coinbase connected</p>
        </div>
      )}
    </div>
  );
};

export default Coinbase;
