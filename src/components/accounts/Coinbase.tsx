import { useEffect, useState } from 'react';
import axios, { AxiosResponse } from 'axios';
import { isProduction } from 'src/utils/helpers';
import { LINKS, COINBASE_AUTH } from 'src/utils/constants';

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
      currency: string;
      balance: {
        amount: string;
        currency: string;
      };
    }
  ];
}

const Coinbase = () => {
  const [authorized, setAuthorized] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [btcWallet, setBtcWallet] = useState('');
  const [coinbaseCode, setCoinbaseCode] = useState('');

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

    const getTransactions = async (id:string) => {
      const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
        `https://api.coinbase.com/v2/accounts/${id}/transactions`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data) {
        console.log(response.data);
      }
    };

    const accessUser = async () => {
      const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(
        COINBASE_AUTH.accountsUrl,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data) {
        // console.log(response.data);
        const wallets = response.data.data;
        // console.log(wallets);
        for (const wallet of wallets){
          if(+parseFloat(wallet.balance.amount) > 0){
            console.log(wallet);
            getTransactions(wallet.id);
          }
          // console.log(wallet);
        }
        setAuthorized(true);
        setBtcWallet(response.data.data[0].balance.amount);
      }
    };

    

    accessUser();
  }, [accessToken]);

  return (
    <div className="App">
      <div>
        {!authorized && (
          <button>
            <a href={generateCoinbaseAuthURL()}>Connect Coinbase</a>
          </button>
        )}
      </div>

      {authorized && <div>BTC Wallet Balance: {btcWallet}</div>}
    </div>
  );
};

export default Coinbase;
