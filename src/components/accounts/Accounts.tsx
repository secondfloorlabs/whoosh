import Metamask from 'src/components/accounts/Metamask';
import Solana from 'src/components/accounts/Solana';
import Coinbase from 'src/components/accounts/Coinbase';
import CoinbasePro from 'src/components/accounts/CoinbasePro';
import Gemini from 'src/components/accounts/Gemini';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { InfoCircle } from 'react-bootstrap-icons';

const Accounts = () => {
  const renderTooltip = (props: any) => <Tooltip {...props}>No data is stored by default</Tooltip>;

  return (
    <div className="portfolioChart2">
      <div style={{ display: 'inline-block;' }}>
        Wallets + Exchanges{' '}
        <OverlayTrigger placement="top" overlay={renderTooltip}>
          <InfoCircle />
        </OverlayTrigger>
      </div>

      <Metamask />
      <Solana />
      <Coinbase />
      <CoinbasePro />
      <Gemini />
    </div>
  );
};

export default Accounts;
