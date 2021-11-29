import * as solanaWeb3 from '@solana/web3.js';

const Solana = () => {
  const connectSolana = async () => {
    // let keypair = solanaWeb3.Keypair.generate();
    let connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
    let slot = await connection.getSlot();
    console.log(slot);
    // const value = await connection.getBalance(
    //   '5jKHHTjPL6G7qMC2LKfgCKKkZrgRgsoBP2ghMja914Mr' as unknown as solanaWeb3.PublicKey
    // );
  };

  return (
    <div className="actions">
      <button onClick={connectSolana}>Connect Solana</button>
    </div>
  );
};

export default Solana;
