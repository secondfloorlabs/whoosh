import { useEffect, useState } from 'react';
import axios, { AxiosResponse } from 'axios';

export interface CoinbaseProps {
  coinbaseCode: string;
}

export interface CoinbaseAccessResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface CoinbaseAccountResponse {
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

const Coinbase = (props: CoinbaseProps) => {
  const [authorized, setAuthorized] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [btcWallet, setBtcWallet] = useState('');

  const client_id = '8ad3a3e1c85af0f56ee3f305b4930a67d8b126df89504c53ae871731ed186a2a';
  const redirect_uri = 'http://localhost:3000/';
  const response_type = 'code';
  const scope = 'wallet:user:read wallet:accounts:read';

  const url = `https://www.coinbase.com/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=${response_type}&scope=${scope}`;

  const coinbaseAuthorize = encodeURI(url);
  const coinbaseAccess = 'https://api.coinbase.com/oauth/token';
  const coinbaseAccount = 'https://api.coinbase.com/v2/accounts';

  useEffect(() => {
    const receiveCoinbaseCode = async () => {
      const response: AxiosResponse<CoinbaseAccessResponse> = await axios.post(coinbaseAccess, {
        grant_type: 'authorization_code',
        code: props.coinbaseCode,
        client_id: '8ad3a3e1c85af0f56ee3f305b4930a67d8b126df89504c53ae871731ed186a2a',
        client_secret: 'ce0e6c99fc27c887ae42b9fa212bf12678cd329ba1330a32849ef738b8c40af8',
        redirect_uri: 'http://localhost:3000',
      });

      if (response.data) {
        console.log(response.data);
        setAccessToken(response.data.access_token);
      }
    };

    receiveCoinbaseCode();
  }, [props.coinbaseCode]);

  useEffect(() => {
    const accessUser = async () => {
      const response: AxiosResponse<CoinbaseAccountResponse> = await axios.get(coinbaseAccount, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.data) {
        console.log(response.data);
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
            <a href={coinbaseAuthorize}>Connect Coinbase</a>
          </button>
        )}
      </div>

      {authorized && <div>BTC Wallet Balance: {btcWallet}</div>}
    </div>
  );
};

export default Coinbase;
