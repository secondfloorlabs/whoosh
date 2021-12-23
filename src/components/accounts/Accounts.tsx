import Metamask from 'src/components/accounts/Metamask';
import Solana from 'src/components/accounts/Solana';
import Coinbase from 'src/components/accounts/Coinbase';

const Accounts = () => {
  return (
    <div className="portfolioChart2">
      <p> Wallets + Exchanges </p>
      <Metamask />
      <br />
      <Solana />
      <br />
      <Coinbase />
    </div>
  );
};

export default Accounts;
