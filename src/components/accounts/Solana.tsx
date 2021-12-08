import { useState } from 'react';
import * as solanaWeb3 from '@solana/web3.js';
import axios from 'axios';

import * as actionTypes from '../../store/actionTypes';
import { useDispatch } from 'react-redux';

import { getWalletBalanceUSD } from 'src/utils/helpers';

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
