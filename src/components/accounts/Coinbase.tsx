import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios, { AxiosResponse } from 'axios';

import { isProduction } from 'src/utils/helpers';
import { LINKS, COINBASE_AUTH, WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';
import * as actionTypes from 'src/store/actionTypes';

interface CoinbaseAccessResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface CoinbaseAccountResponse {
  data: [
    {
      id: string;
      name: string;
      primary: string;
      type: string;
      currency: {
        code: string;
        name: string;
      };
      balance: {
        amount: string;
        currency: string;
      };
    }
  ];
}

interface CoinbaseWallet {
  id: string;
  name: string;
  primary: string;
  type: string;
  currency: {
    code: string;
    name: string;
  };
  balance: {
    amount: string;
    currency: string;
  };
}

const Coinbase = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);

  //// NOTE: Slugs on Coinbase wallets don't always match CoinGecko API
  //// If the number is off, I have no idea what Coinbase is using for their own UI and API to display to the user
  const receiveCoinbasePriceData = async (tokenSlug: any) => {
    const response = await axios.get(`https://api.coinbase.com/v2/prices/${tokenSlug}-USD/sell`);
    if (response) return response.data.data.amount;
  };

  const createCoinbaseUrl = (): string => {
    const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;
    const url = `${COINBASE_AUTH.authorizeUrl}?client_id=${COINBASE_AUTH.client_id}&redirect_uri=${redirect_uri}&response_type=${COINBASE_AUTH.response_type}&scope=${COINBASE_AUTH.scope}&account=${COINBASE_AUTH.account}`;
    return encodeURI(url);
  };

  const accessAccount = async (token: string | null) => {
    // get user data
    const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
      COINBASE_AUTH.accountsUrl,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response;
  };

  const authCodeAccess = async (code: string) => {
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
    return response;
  };

  const refreshTokenAccess = async () => {
    const response: AxiosResponse<CoinbaseAccessResponse> = await axios.post(
      COINBASE_AUTH.oauthTokenUrl,
      {
        grant_type: 'refresh_token',
        client_id: COINBASE_AUTH.client_id,
        client_secret: COINBASE_AUTH.client_secret,
        refresh_token: localStorage.getItem('coinbaseRefreshToken'),
      }
    );
    return response;
  };

  const storeTokensLocally = (response: AxiosResponse<CoinbaseAccessResponse>) => {
    localStorage.setItem('coinbaseAccessToken', response.data.access_token);
    localStorage.setItem('coinbaseRefreshToken', response.data.refresh_token);
  };

  // useEffect:
  /**
   * 1) gets query param, checks if local storage is undefined, so should only run once - runs on every component did mount
   * 2) second, runs on every component mount, checks if localstorage exists, tries it - if expired, then reauth with refresh token
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

            const token: IToken = {
              walletName: WALLETS.COINBASE,
              balance,
              symbol,
              name: wallet.currency.name,
              price,
              lastPrice,
            };

            dispatch({ type: actionTypes.ADD_TOKEN, token: token });
          })
      );
    };

    const coinbaseInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) return;

      const accessResponse = await authCodeAccess(code);

      if (accessResponse.data) {
        const accessToken = accessResponse.data.access_token;
        // setAccessToken(accessToken);
        storeTokensLocally(accessResponse);

        const accountResponse = await accessAccount(accessToken);

        if (accountResponse.data) {
          const wallets: CoinbaseWallet[] = accountResponse.data.data.reverse(); // primary (BTC) wallet is on top of list
          getWalletData(wallets);
          setAuthorized(true);
        }
      }
    };

    const coinbaseReauth = async () => {
      const responseLocal = await accessAccount(localStorage.getItem('coinbaseAccessToken'));

      if (responseLocal.status === 401) {
        const refreshResponse = await refreshTokenAccess();
        if (refreshResponse.data) {
          // refresh local storage
          const accessToken = refreshResponse.data.access_token;
          // setAccessToken(accessToken);
          storeTokensLocally(refreshResponse);

          const accountResponse = await accessAccount(accessToken);

          if (accountResponse.data) {
            const wallets: CoinbaseWallet[] = accountResponse.data.data.reverse(); // primary (BTC) wallet is on top of list
            getWalletData(wallets);
            setAuthorized(true);
          }
        }
      } else {
        const wallets: CoinbaseWallet[] = responseLocal.data.data.reverse(); // primary (BTC) wallet is on top of list
        getWalletData(wallets);
        setAuthorized(true);
      }
    };

    if (localStorage.getItem('coinbaseAccessToken') === null) {
      console.log('runs one time only');
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
          <p>✅ Coinbase connected </p>
        </div>
      )}
    </div>
  );
};

export default Coinbase;
