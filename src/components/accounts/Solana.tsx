import { useState } from 'react';
import * as solanaWeb3 from '@solana/web3.js';

const Solana = () => {
  const [solanaWallet, setSolanaWallet] = useState(0);

  const connectSolana = async () => {
    try {
      const resp = await window.solana.connect();

      const publicKey = resp.publicKey.toString();
      const address = new solanaWeb3.PublicKey(publicKey);
      const network = solanaWeb3.clusterApiUrl('mainnet-beta');
      const connection = new solanaWeb3.Connection(network, 'confirmed');

      const balance = await connection.getBalance(address);
      const sol = balance * 0.000000001;

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

      {solanaWallet && <div>Solana Wallet Balance: {solanaWallet}</div>}
    </div>
  );
};

export default Solana;
