import Metamask from 'src/components/accounts/Metamask';
import Solana from 'src/components/accounts/Solana';
import Coinbase from 'src/components/accounts/Coinbase';
import Gemini from 'src/components/accounts/Gemini';

const Accounts = () => {
  return (
    <div className="portfolioChart2">
      <p> Wallets + Exchanges </p>
      <Metamask />
      <br />
      <Solana />
      <br />
      <Coinbase />
      <br />
      <Gemini />
    </div>
  );
};

export default Accounts;
