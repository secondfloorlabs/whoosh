import { useEffect, useState } from 'react';
import axios, { AxiosResponse } from 'axios';
import { isProduction } from 'src/utils/helpers';
import { LINKS, COINBASE_AUTH, WALLETS } from 'src/utils/constants';
import { useDispatch } from 'react-redux';
import { getCoinPrices } from 'src/utils/prices';

import * as actionTypes from '../../store/actionTypes';

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

  const createCoinbaseUrl = (): string => {
    const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;
    const url = `${COINBASE_AUTH.authorizeUrl}?client_id=${COINBASE_AUTH.client_id}&redirect_uri=${redirect_uri}&response_type=${COINBASE_AUTH.response_type}&scope=${COINBASE_AUTH.scope}&account=${COINBASE_AUTH.account}`;
    return encodeURI(url);
  };

  // query param for coinbase authorization
  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const code = params.get('code');

    if (code) setCoinbaseCode(code);
  }, [coinbaseCode]);

  // grant access via oauth
  useEffect(() => {
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

      if (response.data) setAccessToken(response.data.access_token);
    };

    receiveCoinbaseCode();
  }, [coinbaseCode]);

  // access user account via access token
  useEffect(() => {
    const accessUser = async () => {
      const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
        COINBASE_AUTH.accountsUrl,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      //// NOTE: Slugs on Coinbase wallets don't always match CoinGecko API
      //// If the number is off, I have no idea what Coinbase is using for their own UI and API to display to the user
      const receiveCoinbasePriceData = async (tokenSlug: any) => {
        const response = await axios.get(
          `https://api.coinbase.com/v2/prices/${tokenSlug}-USD/sell`
        );

        if (response) {
          return response.data.data.amount;
        }
      };

      if (response.data) {
        const wallets = response.data.data.reverse(); // primary (BTC) wallet is on top of list

        // map coinbase wallets with positive balances to tokens
        const tokens: IToken[] = await Promise.all(
          wallets
            .filter((wallet) => +parseFloat(wallet.balance.amount) > 0)
            .map(async (wallet) => {
              const coinPrice = await receiveCoinbasePriceData(wallet.balance.currency);
              const price = +parseFloat(coinPrice); // tried to do it 1-liner
              const balance = +parseFloat(wallet.balance.amount);
              const symbol = wallet.currency.code;

              const token: IToken = {
                walletName: WALLETS.COINBASE,
                balance,
                symbol,
                name: wallet.currency.name,
                price,
              };
              return token;
            })
        );

        const symbols = tokens.map((token) => {
          return token.symbol;
        });

        const prices = await getCoinPrices(symbols);

        // join prices to tokens
        tokens.map((token: IToken) => {
          const price = prices.find((p: { id: string }) => p.id === token.symbol)?.price;
          dispatch({ type: actionTypes.ADD_TOKEN, token: token });
          return { ...token, price };
        });

        setAuthorized(true);
      }
    };

    accessUser();
  }, [accessToken, dispatch]);

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
          <p>Coinbase authorized!</p>
        </div>
      )}
    </div>
  );
};

export default Coinbase;
