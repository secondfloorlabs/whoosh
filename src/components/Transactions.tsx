import { useEffect, useState } from 'react';
import Moralis from 'moralis';
import { Table } from 'react-bootstrap';
import { imageOnErrorHandler } from 'src/utils/helpers';

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
        limit: 4,
      };
      const txns: any = await Moralis.Web3API.account.getTokenTransfers(options);
      let timestamps: any = [];
      txns.result.forEach(async (txn: any) => {
        const tokOptions = {
          chain: 'eth' as any,
          addresses: txn.address,
        };
        const tokenData: any = await Moralis.Web3API.token.getTokenMetadata(tokOptions);

        if (!timestamps.includes(txn.block_timestamp)) {
          timestamps.push(txn.block_timestamp);
        } else {
          console.log('swap');
          console.log(Number(txn.value) * Math.pow(10, -Number(tokenData[0].decimals)));
          console.log(tokenData[0].symbol);
        }

        const tradedValue = (Number(txn.value) * 10 ** -Number(tokenData[0].decimals)).toFixed(2);

        if (txn.from_address === wallet.address) {
          const tx = {
            wallet: wallet,
            network: 'eth',
            symbol: tokenData[0].symbol,
            type: 'SELL',
            tradedValue: tradedValue,
            timestamp: new Date(),
          };
          full_arr.push(tx);
        } else {
          const tx = {
            wallet: wallet,
            network: 'eth',
            symbol: tokenData[0].symbol,
            type: 'BUY',
            tradedValue: tradedValue,
            timestamp: new Date(),
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

  return (
    <div className="portfolioChart4">
      <Table borderless style={{ color: 'white', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th>Recent Transactions</th>
          </tr>
        </thead>
        <thead>
          <tr>
            <th>Name</th>
            <th>Transaction</th>
          </tr>
        </thead>
        <tbody>
          {txnArray.map((txn: any) => {
            console.log(txn);
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
                    <small style={{ color: 'gray' }}>{'69 days ago'}</small>
                  </span>
                </td>
                <td key={txn.type} style={{ wordWrap: 'break-word' }}>
                  <span>
                    {txn.type}{' '}
                    <img
                      src={`https://assets.coincap.io/assets/icons/${txn.symbol}@2x.png`}
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
