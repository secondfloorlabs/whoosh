import { Table } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { displayInPercent, displayInUSD } from 'src/utils/helpers';
import * as translations from 'src/utils/translations';
import ImageWithFallback from './ImageWithFallback';

// hardcoded data for wallet watching
const walletWatchData = [
    {
        wallet: 'satman.eth',
        pfp: 'https://pbs.twimg.com/profile_images/1430295542257627137/U0yIgORf_400x400.jpg',
        fromTokenAmount: 3485,
        fromToken: 'USDC',
        toTokenAmount: 655,
        toToken: 'SUSHI',
    },
    {
        wallet: 'beanie.eth',
        pfp: 'https://pbs.twimg.com/profile_images/1469343526748098570/DBuCNJYs_400x400.jpg',
        fromTokenAmount: 101080,
        fromToken: '1INCH',
        toTokenAmount: 261270,
        toToken: 'DAI',
    },
    {
        wallet: 'davecorp.eth',
        pfp: 'https://pbs.twimg.com/profile_images/1471574015739412483/DijXWgEB_400x400.jpg',
        fromTokenAmount: 42690,
        fromToken: 'ETH',
        toTokenAmount: 42690,
        toToken: 'WETH',
    },
    {
        wallet: 'Jeff Beans',
        pfp: 'https://pbs.twimg.com/profile_images/669103856106668033/UF3cgUk4_400x400.jpg',
        fromTokenAmount: 42690,
        fromToken: 'BTC',
        toTokenAmount: 42690,
        toToken: 'ETH',
    },
    {
        wallet: 'Elon Musty',
        pfp: 'https://pbs.twimg.com/profile_images/1442634650703237120/mXIcYtIs_400x400.jpg',
        fromTokenAmount: 42690,
        fromToken: 'ETH',
        toTokenAmount: 42690,
        toToken: 'USDC',
    },
  ];
  

const Transactions = () => {

  return (
    <div className="portfolioChart4">
        <Table borderless style={{ color: 'white' }}>
          <thead>
            <tr>
              <th>Recent Transactions</th>
            </tr>
          </thead>
          <hr />
          <thead>
            <tr>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {walletWatchData.map((txn) => {
                return (
                    <tr>
                        <td key={txn.wallet}>
                            <span>
                                <ImageWithFallback
                                fallback="https://images.emojiterra.com/twitter/v13.1/512px/1fa99.png"
                                src={txn.pfp}
                                height="16px"
                                width="16px"
                                />{' '}
                                {txn.wallet}
                                <br/>
                                <small style={{color:"gray"}}>69 days ago</small>
                            </span>
                        </td>
                        <td key={txn.fromToken}>
                            <span>
                                {txn.fromTokenAmount}
                                <br/>
                                <ImageWithFallback
                                    fallback="https://images.emojiterra.com/twitter/v13.1/512px/1fa99.png"
                                    src={`https://assets.coincap.io/assets/icons/${txn.fromToken.toLowerCase()}@2x.png`}
                                    height="16px"
                                    width="16px"
                                />{' '} 
                                {txn.fromToken}
                            </span>
                        </td>
                        <td >
                            <span>
                                ➜
                            </span>
                        </td>
                        <td key={txn.toToken}>
                            <span>
                                {txn.toTokenAmount} 
                                <br/>
                                <ImageWithFallback
                                    fallback="https://images.emojiterra.com/twitter/v13.1/512px/1fa99.png"
                                    src={`https://assets.coincap.io/assets/icons/${txn.toToken.toLowerCase()}@2x.png`}
                                    height="16px"
                                    width="16px"
                                />{' '} 
                                {txn.toToken}
                            </span>
                        </td>
                    </tr>
                )
            })}
          </tbody>
        </Table>
    </div>
  );
};

export default Transactions;
