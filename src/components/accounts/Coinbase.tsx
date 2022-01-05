import { useContext, useEffect, useState } from 'react';
import { captureMessage } from '@sentry/react';
import { useDispatch } from 'react-redux';
import { Button } from 'react-bootstrap';

import * as actionTypes from 'src/store/actionTypes';

import {
  createCoinbaseUrl,
  accessAccount,
  authCodeAccess,
  storeTokensLocally,
  refreshTokenAccess,
  convertAccountData,
} from 'src/services/coinbase';

import { CoinbaseWallet } from 'src/interfaces/coinbase';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData, getUserData, getUserMetadata } from 'src/services/firebase';

const Coinbase = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  const user = useContext(AuthContext);
  const [loading, setLoading] = useState<Boolean>(true);

  /**
   * This useEffect runs on inital auth, without any access token in local storage
   * Once access/refresh token exists, this runs through separate reauth check
   */
  useEffect(() => {
    const getWalletData = async (wallets: CoinbaseWallet[]) => {
      try {
        const completeToken = await convertAccountData(wallets, user);

        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });
      } catch (err) {
        // any failure, set unauthorized
        captureMessage(String(err));
        setAuthorized(false);
      }
    };

    const coinbaseInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      // if signing in from another device
      if (!code) {
        if (user) {
          // firebase logged in
          const userMetadata = await getUserMetadata(user);

          // store user tokens in localstorage for multiple device sync
          if (userMetadata && userMetadata.access.coinbaseAccessToken) {
            const coinbaseAccessToken = userMetadata.access.coinbaseAccessToken;
            const coinbaseRefreshToken = userMetadata.access.coinbaseRefreshToken;
            localStorage.setItem('coinbaseAccessToken', coinbaseAccessToken);
            localStorage.setItem('coinbaseRefreshToken', coinbaseRefreshToken);
            // retrieve stored wallet data
            const wallets = (await getUserData(user, 'coinbase')) as CoinbaseWallet[];
            getWalletData(wallets);
            setAuthorized(true);
          }
        }
      } else {
        try {
          const coinbaseAccess = await authCodeAccess(code);

          // add local storage
          const coinbaseAccessToken = coinbaseAccess.access_token;
          const coinbaseRefreshToken = coinbaseAccess.refresh_token;
          storeTokensLocally(coinbaseAccess);

          const access = { coinbaseAccessToken, coinbaseRefreshToken };
          if (user) addUserAccessData(user, access);

          const coinbaseAccount = await accessAccount(coinbaseAccessToken);
          const wallets = coinbaseAccount.reverse(); // primary wallet (BTC) top of list
          getWalletData(wallets);
          setAuthorized(true);
        } catch (err) {
          captureMessage(`Invalid coinbase param code\n${err}`);
        }
      }
    };

    const coinbaseReauth = async () => {
      if (user) {
        // firebase logged in
        const userMetadata = await getUserMetadata(user);

        // store user tokens in localstorage for multiple device sync
        if (
          userMetadata &&
          userMetadata.access.coinbaseAccessToken &&
          localStorage.getItem('coinbaseAccessToken') !== null
        ) {
          const coinbaseAccessToken = userMetadata.access.coinbaseAccessToken;
          const coinbaseRefreshToken = userMetadata.access.coinbaseRefreshToken;
          localStorage.setItem('coinbaseAccessToken', coinbaseAccessToken);
          localStorage.setItem('coinbaseRefreshToken', coinbaseRefreshToken);
        }

        // retrieve stored wallet data
        const wallets = (await getUserData(user, 'coinbase')) as CoinbaseWallet[];
        getWalletData(wallets);
        setAuthorized(true);
      } else {
        // not firebase logged in
        let coinbaseAccount: CoinbaseWallet[] = [];
        try {
          coinbaseAccount = await accessAccount(localStorage.getItem('coinbaseAccessToken'));
        } catch (err) {
          try {
            // refresh local storage
            const tokenAccess = await refreshTokenAccess();
            storeTokensLocally(tokenAccess);

            coinbaseAccount = await accessAccount(localStorage.getItem('coinbaseAccessToken'));
          } catch (err) {
            // refresh and access token failed
            coinbaseInitialAuth();
          }
        }
        const wallets = coinbaseAccount.reverse(); // primary (BTC) wallet is on top of list

        try {
          getWalletData(wallets);
        } catch (err) {
          try {
            const tokenAccess = await refreshTokenAccess();

            // refresh local storage
            const coinbaseAccessToken = tokenAccess.access_token;
            const coinbaseRefreshToken = tokenAccess.refresh_token;

            storeTokensLocally(tokenAccess);
            if (user) {
              const access = { coinbaseAccessToken, coinbaseRefreshToken };
              addUserAccessData(user, access);
            }

            getWalletData(wallets);
            setAuthorized(true);
          } catch (err) {
            // refresh and access token failed
            coinbaseInitialAuth();
          }
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
