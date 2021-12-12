import { useState } from 'react';
import * as solanaWeb3 from '@solana/web3.js';
import axios from 'axios';

import * as actionTypes from '../../store/actionTypes';
import { useDispatch } from 'react-redux';

import { getWalletBalanceUSD } from 'src/utils/helpers';
import { getCoinPrices } from '../../utils/prices';
import { connect } from 'http2';

interface SplToken {
  publicKey: string;
  ticker: string;
}

const splTokens = [
  { publicKey: 'GuPGtixpwQTPyN7xHyyT3TMvH1dsir248GQSoTxaAMMs', ticker: 'IN' },
  { publicKey: '9c98UD5dRCSJLk381yo9JNqn5fhiLpYnePE17tAucTP6', ticker: 'USDC' },
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
  const [solanaWallet, setSolanaWallet] = useState(0);
  const [solPrice] = useState(0);

  const connectSolana = async () => {
    try {
      const resp = await window.solana.connect();

      const publicKey = resp.publicKey.toString();
      const address = new solanaWeb3.PublicKey(publicKey);
      const network = solanaWeb3.clusterApiUrl('mainnet-beta');
      const connection = new solanaWeb3.Connection(network, 'confirmed');

      const balance = await connection.getBalance(address);

      const inToken = await connection.getTokenAccountsByOwner(address, {
        programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      // const splToken = await connection.getTokenAccountBalance(new solanaWeb3.PublicKey("3pNHfhH31Ch7uCe5DCHj3EmHUWS2bZziUSZcP6CByZqF"));
      // console.log(splToken);

      console.log(inToken);
      console.log(inToken.value[1].pubkey.toString());

      const tokens: { balance: number; tokenKey: string }[] = [];
      await Promise.all(
        inToken.value.map(async (token) => {
          const tokenKey = token.pubkey;
          const value = (await connection.getTokenAccountBalance(tokenKey)).value;
          console.log(tokenKey.toString());
          if (value.amount !== '0' && value.decimals !== 0) {
            const balance = parseFloat(value.amount) / 10 ** value.decimals;
            tokens.push({ balance: balance, tokenKey: tokenKey.toString() });
            console.log(balance);
          }
        })
      );

      const sol = balance * 0.000000001;
      let coinPrice;
      try {
        coinPrice = await getSolanaPrice();
      } catch (e) {
        console.error(e);
      }

      const solToken: IToken = {
        walletAddress: address.toString(),
        walletName: 'Phantom',
        network: 'Solana',
        balance: sol,
        symbol: 'SOL',
        name: 'Solana',
        price: coinPrice,
      };
      dispatch({ type: actionTypes.ADD_TOKEN, token: solToken });

      setSolanaWallet(sol);

      const tokensWithTicker: { balance: number; tokenKey: string; symbol: string }[] = tokens
        .map((token) => {
          const ticker = splTokens.find((splToken) => splToken.publicKey === token.tokenKey)
            ?.ticker;
          return { ...token, symbol: ticker as string };
        })
        .filter((ticker) => ticker.symbol !== undefined);

      const symbols = tokensWithTicker.map((token) => {
        return token.symbol;
      });

      const prices = await getCoinPrices(symbols);

      const tokensWithPrice = tokensWithTicker.map((token) => {
        const price = prices.find((p: { id: string }) => p.id === token.symbol)?.price;
        return {
          ...token,
          price: +price,
        };
      });

      tokensWithPrice.forEach((token) => {
        dispatch({
          type: actionTypes.ADD_TOKEN,
          token: {
            ...token,
            walletAddress: address.toString(),
            walletName: 'Phantom',
            network: 'Solana',
          },
        });
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

      {solanaWallet && (
        <div>Solana Wallet Balance in USD: {getWalletBalanceUSD(solanaWallet, solPrice)}</div>
      )}
    </div>
  );
};

export default Solana;
