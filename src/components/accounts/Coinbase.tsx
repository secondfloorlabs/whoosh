import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios, { AxiosResponse } from 'axios';

import { isProduction } from 'src/utils/helpers';
import { LINKS, COINBASE_AUTH, WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';
import * as actionTypes from 'src/store/actionTypes';
import { add, compareAsc } from 'date-fns';

//// NOTE: Code to get transactions for each wallet -- could be used later

// const getTransactions = async (id:string) => {
//   const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
//     `https://api.coinbase.com/v2/accounts/${id}/transactions`,
//     {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     }
//   );

//   if (response.data) {
//     console.log(response.data);
//   }
// };

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

const Coinbase = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  const [accessToken, setAccessToken] = useState<String>();

  const [coinbaseCode, setCoinbaseCode] = useState<String | null>();
  const accessAuth = accessToken || localStorage.getItem('coinbaseAccessToken') || '';

  // console.log(accessToken);

  // const dateOfAccessToken = new Date(localStorage.getItem('dateOfAccessToken') || '');
  // const isTokenExpired =
  //   localStorage.getItem('dateOfAccessToken') !== ''
  //     ? compareAsc(add(dateOfAccessToken, { seconds: 7200 }), new Date())
  //     : 1;
  // const isAccessTokenSet = useRef(isTokenExpired === 1);

  //// NOTE: Slugs on Coinbase wallets don't always match CoinGecko API
  //// If the number is off, I have no idea what Coinbase is using for their own UI and API to display to the user
  const receiveCoinbasePriceData = async (tokenSlug: any) => {
    const response = await axios.get(`https://api.coinbase.com/v2/prices/${tokenSlug}-USD/sell`);

    if (response) {
      return response.data.data.amount;
    }
  };

  const createCoinbaseUrl = (): string => {
    const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;
    const url = `${COINBASE_AUTH.authorizeUrl}?client_id=${COINBASE_AUTH.client_id}&redirect_uri=${redirect_uri}&response_type=${COINBASE_AUTH.response_type}&scope=${COINBASE_AUTH.scope}&account=${COINBASE_AUTH.account}`;
    return encodeURI(url);
  };

  // reauth after token expires
  useEffect(() => {
    const getWalletData = async () => {
      const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
        COINBASE_AUTH.accountsUrl,
        {
          headers: {
            Authorization: `Bearer ${
              accessToken || localStorage.getItem('coinbaseAccessToken') || ''
            }`,
          },
        }
      );

      if (response.data) {
        const wallets = response.data.data.reverse(); // primary (BTC) wallet is on top of list

        // map coinbase wallets with positive balances to tokens
        await Promise.all(
          wallets
            .filter((wallet) => +parseFloat(wallet.balance.amount) > 0)
            .map(async (wallet) => {
              const coinPrice = await receiveCoinbasePriceData(wallet.balance.currency);
              let price = +parseFloat(coinPrice); // tried to do it 1-liner
              const balance = +parseFloat(wallet.balance.amount);
              const symbol = wallet.currency.code;

              try {
                const historicalPrices = await getCoinPriceFromName(
                  wallet.currency.name,
                  wallet.currency.code
                );
                // TODO: Add historical price to redux
                const coinGeckoPrice = historicalPrices[historicalPrices.length - 1][1];
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
              };

              dispatch({ type: actionTypes.ADD_TOKEN, token: token });
            })
        );

        setAuthorized(true);
      }
    };

    const reAuth = async () => {
      // console.log('reauthing');
      const response: AxiosResponse<CoinbaseAccessResponse> = await axios.post(
        COINBASE_AUTH.oauthTokenUrl,
        {
          grant_type: 'refresh_token',
          client_id: COINBASE_AUTH.client_id,
          client_secret: COINBASE_AUTH.client_secret,
          refresh_token: localStorage.getItem('coinbaseRefreshToken'),
        }
      );

      if (response.data) {
        // console.log('inside response data reauthing');
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        const accessExpire = response.data.expires_in;
        // setAccessToken(accessToken);
        localStorage.setItem('coinbaseAccessToken', accessToken);
        localStorage.setItem('coinbaseRefreshToken', refreshToken);
        localStorage.setItem('coinbaseAccessTokenExpire', String(accessExpire));
        localStorage.setItem('dateOfAccessToken', String(new Date()));

        // call data stuff here
        getWalletData();
      }
    };

    const checkAccessToken = async () => {
      const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
        COINBASE_AUTH.accountsUrl,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('coinbaseAccessToken')}`,
          },
        }
      );

      return response;
    };

    if (localStorage.getItem('coinbaseAccessToken')) {
      // console.log('inside true check');
      checkAccessToken()
        .then((value) => {
          // console.log(value);
          if (value.data) {
            // console.log('valid second coinbaseAccessToken run');
            // get wallet data
            getWalletData();
          } else {
          }
        })
        .catch((err) => {
          // console.log(err);
          // get new token
          // console.log('invalid second coinbaseAccessToken run');

          reAuth();

          // get wallet data
          // getWalletData();
        });
    } else {
      // console.log('reauthing');
      reAuth();
    }
  }, []);

  // query param for coinbase authorization
  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const code = params.get('code');

    if (code) setCoinbaseCode(code);
  }, [coinbaseCode]);

  // grant access via oauth
  useEffect(() => {
    const accessUser = async () => {
      const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
        COINBASE_AUTH.accountsUrl,
        {
          headers: {
            Authorization: `Bearer ${
              accessToken || localStorage.getItem('coinbaseAccessToken') || ''
            }`,
          },
        }
      );

      if (response.data) {
        const wallets = response.data.data.reverse(); // primary (BTC) wallet is on top of list

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

        setAuthorized(true);
      }
    };

    const receiveCoinbaseCode = async () => {
      const response: AxiosResponse<CoinbaseAccessResponse> = await axios.post(
        COINBASE_AUTH.oauthTokenUrl,
        {
          grant_type: COINBASE_AUTH.grant_type,
          code: coinbaseCode,
          client_id: COINBASE_AUTH.client_id,
          client_secret: COINBASE_AUTH.client_secret,
          redirect_uri: isProduction() ? LINKS.baseURL : LINKS.localURL,
        }
      );

      if (response.data) {
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        const accessExpire = response.data.expires_in;
        setAccessToken(accessToken);
        localStorage.setItem('coinbaseAccessToken', accessToken);
        localStorage.setItem('coinbaseRefreshToken', refreshToken);
        localStorage.setItem('coinbaseAccessTokenExpire', String(accessExpire));
        localStorage.setItem('dateOfAccessToken', String(new Date()));
        accessUser();
      }
    };

    receiveCoinbaseCode();
  }, [coinbaseCode]);

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
