import { useState, useEffect } from 'react';
import * as solanaWeb3 from '@solana/web3.js';
import axios from 'axios';

import * as actionTypes from '../../store/actionTypes';
import { useDispatch } from 'react-redux';

import * as React from 'react';

const Solana = () => {
  const dispatch = useDispatch();
  const [solanaWallet, setSolanaWallet] = useState(0);
  const [solPrice, setSolPrice] = useState(0);

  useEffect(() => {
    const receiveCoinGeckoSolData = async () => {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=solana'
      );

      if (response) {
        setSolPrice(response.data[0].current_price);
      }
    };

    receiveCoinGeckoSolData();
  }, []);

  const connectSolana = async () => {
    try {
      const resp = await window.solana.connect();

      const publicKey = resp.publicKey.toString();
      const address = new solanaWeb3.PublicKey(publicKey);
      const network = solanaWeb3.clusterApiUrl('mainnet-beta');
      const connection = new solanaWeb3.Connection(network, 'confirmed');

      const balance = await connection.getBalance(address);
      const sol = balance * 0.000000001;

      const solToken: IToken = {
        walletAddress: address.toString(),
        walletName: 'Phantom',
        network: 'Solana',
        balance: sol,
        symbol: 'SOL',
        name: 'Solana',
      };
      dispatch({ type: actionTypes.ADD_TOKEN, token: solToken });

      setSolanaWallet(sol);
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
        <div>Solana Wallet Balance in USD: {(solanaWallet * solPrice).toFixed(2)}</div>
      )}
    </div>
  );
};

export default Solana;
