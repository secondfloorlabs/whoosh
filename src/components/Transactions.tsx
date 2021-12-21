import { useEffect, useState } from 'react';
import Moralis from 'moralis';

import { Table } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { displayInPercent, displayInUSD } from 'src/utils/helpers';
import * as translations from 'src/utils/translations';

import { getCoinPriceFromNameAndHistory, getERC20EtherScan } from 'src/utils/prices';

// hardcoded data for wallet watching
const walletWatchData = [
  {
    name: 'satman.eth',
    pfp: 'https://pbs.twimg.com/profile_images/1430295542257627137/U0yIgORf_400x400.jpg',
    address: '0x3401ea5a8d91c5e3944962c0148b08ac4a77f153',
  },
  {
    name: 'beanie.eth',
    pfp: 'https://pbs.twimg.com/profile_images/1469343526748098570/DBuCNJYs_400x400.jpg',
    address: '0xabf107de3e01c7c257e64e0a18d60a733aad395d',
  },
  {
    name: '6529.eth',
    pfp: 'https://pbs.twimg.com/profile_images/1440017111531855879/A4p6F07H_400x400.jpg',
    address: '0xfd22004806a6846ea67ad883356be810f0428793',
  },
];

const Transactions = () => {
  const [txnArray, setTxnArray] = useState([]);

  const getMoralisData = async (wallet: any) => {
    let full_arr: any = [];

    walletWatchData.forEach(async (wallet) => {
      const options = {
        chain: 'eth' as any,
        address: wallet.address,
        limit: 5,
      };
      const txns: any = await Moralis.Web3API.account.getTokenTransfers(options);
      // let timestamps: any = [];
      txns.result.forEach(async (txn: any) => {
        const tokOptions = {
          chain: 'eth' as any,
          addresses: txn.address,
        };
        const tokenData: any = await Moralis.Web3API.token.getTokenMetadata(tokOptions);

        // let currentPrice: number = 0;
        // try {
        //     const historicalPrices: any = await getCoinPriceFromNameAndHistory(tokenData[0].name, tokenData[0].symbol, txn.block_timestamp);
        //     currentPrice = historicalPrices.market_data.current_price.usd;
        //   } catch (e) {
        //     console.error(e);
        // }

        //// TODO: SWAP logic
        // if(!timestamps.includes(txn.block_timestamp)){
        //     timestamps.push(txn.block_timestamp);
        // } else {
        //     console.log('swap');
        //     console.log(Number(txn.value) * Math.pow(10,-Number(tokenData[0].decimals)));
        //     console.log(tokenData[0].symbol);
        // }

        const tradedValue = (Number(txn.value) * 10 ** -Number(tokenData[0].decimals)).toFixed(2);

        if (txn.from_address == wallet.address) {
          const tx = {
            wallet: wallet,
            network: 'eth',
            symbol: tokenData[0].symbol,
            type: 'SELL',
            tradedValue: tradedValue,
          };
          full_arr.push(tx);
        } else {
          const tx = {
            wallet: wallet,
            network: 'eth',
            symbol: tokenData[0].symbol,
            type: 'BUY',
            tradedValue: tradedValue,
          };
          full_arr.push(tx);
        }
      });
    });
    setTxnArray(full_arr);
  };

  const getAllData = async () => {
    walletWatchData.forEach((wallet) => {
      getMoralisData(wallet);
    });
  };

  useEffect(() => {
    getAllData();
  }, []);

  // This function is triggered if an error occurs while loading an image
  const imageOnErrorHandler = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    event.currentTarget.src = 'https://images.emojiterra.com/twitter/v13.1/512px/1fa99.png';
  };

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
          </tr>
        </thead>
        <tbody>
          {txnArray.map((txn: any) => {
            return (
              <tr>
                <td key={txn.wallet.name}>
                  <span>
                    <img
                      src={txn.wallet.pfp}
                      height="16px"
                      width="16px"
                      onError={imageOnErrorHandler}
                      alt=""
                    ></img>{' '}
                    {txn.wallet.name}
                    <br />
                    <small style={{ color: 'gray' }}>69 days ago</small>
                  </span>
                </td>
                <td key={txn.type}>
                  <span>
                    {txn.type}{' '}
                    <img
                      src={`https://assets.coincap.io/assets/icons/${txn.symbol.toLowerCase()}@2x.png`}
                      height="16px"
                      width="16px"
                      onError={imageOnErrorHandler}
                      alt=""
                    ></img>{' '}
                    {txn.tradedValue} {txn.symbol}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default Transactions;
