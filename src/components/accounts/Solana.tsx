import { useState } from 'react';
import * as solanaWeb3 from '@solana/web3.js';
import axios from 'axios';

import * as actionTypes from '../../store/actionTypes';
import { useDispatch } from 'react-redux';

import { getCoinPriceFromId } from '../../utils/prices';
import { WALLETS } from 'src/utils/constants';

interface SplToken {
  publicKey: string;
  ticker: string;
  coinGeckoId: string;
}

const splTokens: SplToken[] = [
  {
    publicKey: 'GuPGtixpwQTPyN7xHyyT3TMvH1dsir248GQSoTxaAMMs',
    coinGeckoId: 'invictus',
    ticker: 'IN',
  },
  {
    publicKey: '9c98UD5dRCSJLk381yo9JNqn5fhiLpYnePE17tAucTP6',
    coinGeckoId: 'usd-coin',
    ticker: 'USDC',
  },
];

const getSolanaPrice = async () => {
  const response = await axios.get(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=solana'
  );

  if (!response || response.data.length <= 0 || !response.data[0].current_price) {
    throw new Error('No coingecko price found for coin: SOL');
  }

  return response.data[0].current_price;
};

const Solana = () => {
  const dispatch = useDispatch();
  const [solanaWallet, setSolanaWallet] = useState(false);

  const connectSolana = async () => {
    try {
      const resp = await window.solana.connect();

      const publicKey = resp.publicKey.toString();
      const address = new solanaWeb3.PublicKey(publicKey);
      const network = solanaWeb3.clusterApiUrl('mainnet-beta');
      const connection = new solanaWeb3.Connection(network, 'confirmed');

      const balance = await connection.getBalance(address);

      const sol = balance * 0.000000001;
      let coinPrice;
      try {
        coinPrice = await getSolanaPrice();
      } catch (e) {
        console.error(e);
      }

      const solToken: IToken = {
        walletAddress: address.toString(),
        walletName: WALLETS.PHANTOM,
        network: 'Solana',
        balance: sol,
        symbol: 'SOL',
        name: 'Solana',
        price: coinPrice,
      };
      dispatch({ type: actionTypes.ADD_TOKEN, token: solToken });

      setSolanaWallet(true);

      const tokenAccounts = await connection.getTokenAccountsByOwner(address, {
        programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      tokenAccounts.value.forEach(async (token) => {
        const tokenKey = token.pubkey;
        const value = (await connection.getTokenAccountBalance(tokenKey)).value;
        if (value.amount !== '0' && value.decimals !== 0) {
          const balance = parseFloat(value.amount) / 10 ** value.decimals;
          const tokenMetadata = splTokens.find(
            (splToken) => splToken.publicKey === tokenKey.toString()
          );
          if (!tokenMetadata) {
            return;
          }
          const coinGeckoId = tokenMetadata?.coinGeckoId;
          const symbol = tokenMetadata?.ticker;
          const historicalPrices = await getCoinPriceFromId(coinGeckoId);
          const price = historicalPrices[historicalPrices.length - 1][1];

          dispatch({
            type: actionTypes.ADD_TOKEN,
            token: {
              ...token,
              balance,
              symbol,
              price,
              walletAddress: address.toString(),
              walletName: 'Phantom',
              network: 'Solana',
            },
          });
        }
      });
    } catch (err) {
      // error message
      console.log(err);
    }
  };

  return (
    <div>
      {!solanaWallet && (
        <div>
          <button onClick={connectSolana}>Connect Solana</button>
        </div>
      )}
      {solanaWallet && <div>✅ Solana connected </div>}
    </div>
  );
};

export default Solana;
