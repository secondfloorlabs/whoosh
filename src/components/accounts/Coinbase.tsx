import { useEffect, useState } from 'react';
import axios, { AxiosResponse } from 'axios';
import { getWalletBalanceUSD, isProduction } from 'src/utils/helpers';
import { LINKS, COINBASE_AUTH, WALLETS } from 'src/utils/constants';
import { useDispatch } from 'react-redux';

import * as actionTypes from '../../store/actionTypes';

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

interface LooseWallet {
  [key: string]: any;
}

const Coinbase = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [coinbaseWallets, setCoinbaseWallets] = useState<any[]>([]); //probably want to change to Interface later
  const [coinbaseCode, setCoinbaseCode] = useState('');

  const getCoinPrices = async (symbols: string[]) => {
    const ids = symbols.join(',');
    const response = await axios.get(
      `https://api.nomics.com/v1/currencies/ticker?key=345be943016fa1e2f6550e237d6fbf125ed7566f&ids=${ids}&convert=USD&per-page=100&page=1`
    );

    if (!response || response.data.length <= 0) {
      throw new Error('No coingecko price found for coins: ' + ids);
    }

    return response.data;
  };

  const generateCoinbaseAuthURL = (): string => {
    const redirect_uri = isProduction() ? LINKS.baseURL : LINKS.localURL;

    const url = `${COINBASE_AUTH.authorizeUrl}?client_id=${COINBASE_AUTH.client_id}&redirect_uri=${redirect_uri}&response_type=${COINBASE_AUTH.response_type}&scope=${COINBASE_AUTH.scope}&account=${COINBASE_AUTH.account}`;

    return encodeURI(url);
  };

  // return query param for coinbase authorization
  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const code = params.get('code');

    if (code) {
      setCoinbaseCode(code);
    }
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

      if (response.data) {
        setAccessToken(response.data.access_token);
      }
    };

    receiveCoinbaseCode();
  }, [coinbaseCode]);

  // access user account via access token
  useEffect(() => {
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

    const accessUser = async () => {
      const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
        COINBASE_AUTH.accountsUrl,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      //// NOTE: Did this because slugs on Coinbase wallets dont always match CoinGecko API
      //// If the number is off, I have no idea what Coinbase is using for their own UI and API to display to the user
      const receiveCoinbasePriceData = async (tokenSlug: any) => {
        const response = await axios.get(
          `https://api.coinbase.com/v2/prices/${tokenSlug}-USD/sell`
        );

        if (response) {
          // console.log(tokenSlug);
          // console.log(response.data.amount);
          return response.data.data.amount;
        }
      };

      if (response.data) {
        console.log(response.data);
        const allWallets = response.data.data.reverse(); // reversed so primary (BTC) wallet is on top of list
        const wallets = [];
        const tokens = [];
        for (const wallet of allWallets) {
          if (+parseFloat(wallet.balance.amount) > 0) {
            const wal: LooseWallet = {};
            wal.price = await receiveCoinbasePriceData(wallet.balance.currency);
            wal.price = +parseFloat(wal.price); //tried to do it 1-liner
            wal.amount = +parseFloat(wallet.balance.amount);
            wal.name = wallet.name;
            wal.symbol = wallet.currency.code;
            wallets.push(wal);

            // console.log(wal);

            const token: IToken = {
              walletName: WALLETS.COINBASE,
              balance: wal.amount,
              symbol: wallet.currency.code,
              name: wallet.currency.name,
              price: wal.price,
            };

            tokens.push(token);

            // dispatch({ type: actionTypes.ADD_TOKEN, token: token });
          }
        }

        console.log(wallets);

        const symbols = tokens.map((token) => {
          return token.symbol;
        });

        console.log('SYMBOLS');
        console.log(symbols);

        const prices = await getCoinPrices(symbols);
        console.log(prices);

        // join prices to tokens
        const tokensWithPrice = tokens.map((token) => {
          const price = prices.find((p: { id: string }) => p.id === token.symbol)?.price;
          return {
            ...token,
            price,
          };
        });

        console.log(tokensWithPrice);

        tokensWithPrice.forEach((token) => {
          dispatch({ type: actionTypes.ADD_TOKEN, token: token });
        });

        setAuthorized(true);
        setCoinbaseWallets(wallets);
      }
    };

    accessUser();
  }, [accessToken, dispatch]);

  return (
    <div className="App">
      <div>
        {!authorized && (
          <button>
            <a href={generateCoinbaseAuthURL()}>Connect Coinbase</a>
          </button>
        )}
      </div>

      {authorized && (
        <div style={{ height: '100%' }}>
          {coinbaseWallets.map((wallet) => {
            return (
              <p>
                {' '}
                CB {wallet.name} Balance in USD: {getWalletBalanceUSD(wallet.amount, wallet.price)}{' '}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Coinbase;
