import { useEffect, useState } from 'react';
import Moralis from 'moralis';

import { Table } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { displayInPercent, displayInUSD } from 'src/utils/helpers';
import * as translations from 'src/utils/translations';
import ImageWithFallback from './ImageWithFallback';

import { getCoinPriceFromNameAndHistory } from 'src/utils/prices';

// hardcoded data for wallet watching
const walletWatchData = [
    {
        wallet: 'satman.eth',
        pfp: 'https://pbs.twimg.com/profile_images/1430295542257627137/U0yIgORf_400x400.jpg',
        fromTokenAmount: 3485,
        fromToken: 'USDC',
        toTokenAmount: 655,
        toToken: 'SUSHI',
        address: '0x3401ea5a8d91c5e3944962c0148b08ac4a77f153',
    },
    {
        wallet: 'beanie.eth',
        pfp: 'https://pbs.twimg.com/profile_images/1469343526748098570/DBuCNJYs_400x400.jpg',
        fromTokenAmount: 101080,
        fromToken: '1INCH',
        toTokenAmount: 261270,
        toToken: 'DAI',
        address: '0xabf107de3e01c7c257e64e0a18d60a733aad395d',
    },
    {
        wallet: '6529.eth',
        pfp: 'https://pbs.twimg.com/profile_images/1469343526748098570/DBuCNJYs_400x400.jpg',
        fromTokenAmount: 101080,
        fromToken: '1INCH',
        toTokenAmount: 261270,
        toToken: 'DAI',
        address: '0xfd22004806a6846ea67ad883356be810f0428793',
    },
  ];
  

const Transactions = () => {

    const getMoralisData = async (name:string, address: string) => {
        const options = {
            chain: "eth" as any,
            address: address,
            limit: 5,
          };
        const txns: any = await Moralis.Web3API.account.getTokenTransfers(options);
        
        // let timestamps: any = [];
        txns.result.forEach(async (txn: any) => {
            const tokOptions = {
                chain: "eth" as any,
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

            // console.log(tokenData);
            // console.log(txn);
            // console.log(Number(txn.value));
            // console.log(Number(tokenData[0].decimals));
            // console.log(Math.pow(10,-Number(tokenData.decimals)));

            //// TODO: SWAP logic
            // if(!timestamps.includes(txn.block_timestamp)){
            //     timestamps.push(txn.block_timestamp);
            // } else {
            //     console.log('swap');
            //     console.log(Number(txn.value) * Math.pow(10,-Number(tokenData[0].decimals)));
            //     console.log(tokenData[0].symbol);
            // }
            
            if(txn.from_address == address){
                //add current prices from above
                console.log(`${name} sell ${(Number(txn.value) * Math.pow(10,-Number(tokenData[0].decimals))).toFixed(2)} ${tokenData[0].symbol}`);

            } else {
                console.log(`${name} buy ${(Number(txn.value) * Math.pow(10,-Number(tokenData[0].decimals))).toFixed(2)} ${tokenData[0].symbol}`);
            }
        });

        // console.log(txns);
        // txns.result[0].forEach((txn:any) => {
        //     console.log(txn.address);
        // })
        // return txns;
    };

    useEffect(() => {
        walletWatchData.forEach((wallet) => {
            const txns = getMoralisData(wallet.wallet, wallet.address);
            console.log(txns);
        })
    },[]);

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
