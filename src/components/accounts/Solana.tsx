import { useState, useEffect } from 'react';
import * as solanaWeb3 from '@solana/web3.js';
import axios from 'axios';

import * as actionTypes from 'src/store/actionTypes';
import { useDispatch } from 'react-redux';

import { getCoinPriceFromId } from 'src/utils/prices';
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
    `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=max&interval=minutely`
  );

  if (!response) {
    throw new Error('No coingecko price found for coin: SOL');
  }

  return response.data;
};

const Solana = () => {
  const dispatch = useDispatch();
  const [solanaWallet, setSolanaWallet] = useState(false);
  const solanaAddress = localStorage.getItem('solanaAddress');

  const connectSolana = async (pubKey: solanaWeb3.PublicKey) => {
    try {
      const address = new solanaWeb3.PublicKey(pubKey);
      const network = solanaWeb3.clusterApiUrl('mainnet-beta');
      const connection = new solanaWeb3.Connection(network, 'confirmed');
      setSolanaWallet(true);

      const balance = await connection.getBalance(address);

      const sol = balance * 0.000000001;
      let price, lastPrice;
      try {
        const historicalPrices = await getCoinPriceFromId('solana');
        price = historicalPrices[historicalPrices.length - 1][1];
        lastPrice = historicalPrices[historicalPrices.length - 2][1];
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
        price: price,
        lastPrice: lastPrice,
      };
      dispatch({ type: actionTypes.ADD_TOKEN, token: solToken });

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
          const lastPrice = historicalPrices[historicalPrices.length - 2][1];

          dispatch({
            type: actionTypes.ADD_TOKEN,
            token: {
              ...token,
              balance,
              symbol,
              price,
              lastPrice,
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

  const connectSolanaFromWallet = async () => {
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      localStorage.setItem('solanaAddress', addr);

      const pubKey = new solanaWeb3.PublicKey(addr);
      connectSolana(pubKey);
    } catch (err) {
      // error message
      console.log(err);
    }
  };

  const connectSolanaFromInput = async (e: any) => {
    e.preventDefault();
    try {
      const addr = e.target.address.value;
      //TODO: lol this isOnCurve function doesn't even work???
      if (solanaWeb3.PublicKey.isOnCurve(addr)) {
        const pubKey = new solanaWeb3.PublicKey(addr);
        localStorage.setItem('solanaAddress', addr);
        connectSolana(pubKey);
      } else {
        alert('Invalid Sol address');
      }
    } catch (err) {
      // error message
      console.log(err);
      alert(err);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('solanaAddress') !== null) {
      const addr: string = String(localStorage.getItem('solanaAddress'));
      const pubKey = new solanaWeb3.PublicKey(addr);

      connectSolana(pubKey);
    }
  }, [solanaAddress]);

  return (
    <div>
      {!solanaWallet && (
        <div>
          <button onClick={connectSolanaFromWallet}>Connect Solana</button>
          <form onSubmit={connectSolanaFromInput}>
            <input type="text" name="address" placeholder="or paste Sol address here" />
            <button type="submit">Submit</button>
          </form>
        </div>
      )}
      {solanaWallet && <div>✅ Solana connected </div>}
    </div>
  );
};

export default Solana;
