import { useEffect, useState } from 'react';
import axios, { AxiosResponse } from 'axios';
import { getWalletBalanceUSD, isProduction } from 'src/utils/helpers';
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

interface LooseWallet {
  [key: string]: any;
}

const Coinbase = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  const [accessToken, setAccessToken] = useState<String>();
  const [coinbaseWallets, setCoinbaseWallets] = useState<LooseWallet[]>([]);
  const [coinbaseCode, setCoinbaseCode] = useState<String | null>();

  const generateCoinbaseAuthURL = (): string => {
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

      //// NOTE: Did this because slugs on Coinbase wallets dont always match CoinGecko API
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
        const allWallets = response.data.data.reverse(); // primary (BTC) wallet is on top of list
        const wallets: LooseWallet[] = [];

        // map coinbase wallets with positive balances to tokens
        const tokens: IToken[] = await Promise.all(
          allWallets
            .filter((wallet) => +parseFloat(wallet.balance.amount) > 0)
            .map(async (wallet) => {
              const wal: LooseWallet = {};
              wal.price = await receiveCoinbasePriceData(wallet.balance.currency);
              wal.price = +parseFloat(wal.price); //tried to do it 1-liner
              wal.amount = +parseFloat(wallet.balance.amount);
              wal.symbol = wallet.currency.code;
              wallets.push(wal);

              const token: IToken = {
                walletName: WALLETS.COINBASE,
                balance: wal.amount,
                symbol: wallet.currency.code,
                name: wallet.currency.name,
                price: wal.price,
              };
              return token;
            })
        );

        const symbols = tokens.map((token) => {
          return token.symbol;
        });

        const prices = await getCoinPrices(symbols);

        // join prices to tokens
        const tokensWithPrice = tokens.map((token) => {
          const price = prices.find((p: { id: string }) => p.id === token.symbol)?.price;
          return {
            ...token,
            price,
          };
        });

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
