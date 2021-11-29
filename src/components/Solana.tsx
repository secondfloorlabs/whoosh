import * as solanaWeb3 from '@solana/web3.js';

const Solana = () => {
  const connectSolana = async () => {
    try {
      const resp = await window.solana.connect();

      const publicKey = resp.publicKey.toString();
      const address = new solanaWeb3.PublicKey(publicKey);
      const network = solanaWeb3.clusterApiUrl('mainnet-beta');
      let connection = new solanaWeb3.Connection(network, 'confirmed');

      const account = await connection.getAccountInfo(address);
      console.log(account);

      const balance = await connection.getBalance(address);

      const sol = balance * 0.000000001;
      console.log(sol);
    } catch (err) {
      // error message
      console.log(err);
    }
  };

  return (
    <div>
      <div className="actions">
        <button onClick={connectSolana}>Connect Solana</button>
      </div>
    </div>
  );
};

export default Solana;
