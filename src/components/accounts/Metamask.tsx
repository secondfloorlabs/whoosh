import { useState, useEffect } from 'react';
import Moralis from 'moralis';

import Web3 from 'web3';

import * as actionTypes from 'src/store/actionTypes';
import {
  getCoinPriceFromName,
  getHistoricalBalanceFromMoralis,
  getHistoricalNativeBalanceFromMoralis,
  getMoralisDateToBlock,
  getCovalentHistorical
} from 'src/utils/prices';
import { useDispatch } from 'react-redux';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import { merge } from 'src/utils/helpers';

/* Moralis init code */
const serverUrl = 'https://pbmzxsfg3wj1.usemoralis.com:2053/server';
const appId = 'TcKOpTzYpLYgcelP2i21aJpclyAMiLUvRG5H5Gng';
Moralis.start({ serverUrl, appId });

interface Chain {
  network: string;
  symbol: string;
  name: string;
  decimals: string;
  covalentId: string;
}

interface TokenMetadata {
  [tokenAddress: string]: {
    decimals: string;
    symbol: string;
    name: string;
  };
}

interface TokenBalance {
  balance: number;
  timestamp: number;
  tokenAddress: string;
}

const SUPPORTED_CHAINS: Chain[] = [
  {
    network: 'eth',
    symbol: 'ETH',
    name: 'ethereum',
    decimals: '18',
    covalentId: '1',
  },
  {
    network: 'bsc',
    symbol: 'BNB',
    name: 'binance',
    decimals: '18',
    covalentId: '56',

  },
  {
    network: 'polygon',
    symbol: 'MATIC',
    name: 'matic',
    decimals: '18',
    covalentId: '137',

  },
  {
    network: 'avalanche',
    symbol: 'AVAX',
    name: 'avalanche',
    decimals: '18',
    covalentId: '43114',

  },
  {
    network: 'fantom',
    symbol: 'FTM',
    name: 'fantom',
    decimals: '18',
    covalentId: '250',

  },
];

const coinGeckoTimestamps = getCoinGeckoTimestamps();

const Metamask = () => {
  const dispatch = useDispatch();
  const [web3Enabled, setWeb3Enabled] = useState(false);

  let web3: Web3 = new Web3();

  const getMonthHistorical = async (address: string) => {
    const tokens: IToken[] = [];
    const dailyNWMonth: any = {};

    await Promise.all(
      SUPPORTED_CHAINS.map(async (chain) => {

        const dailyBalancesMonth = await getCovalentHistorical(chain.covalentId, address);        

        dailyBalancesMonth.items.forEach((item: any) => {
          console.log(item);

          item.holdings.forEach((holding:any) => {

            // const completeToken: IToken = {
            //   walletName: 'metamask',
            //   balance: currentBalance,
            //   symbol: token.symbol,
            //   name: token.name,
            //   network: token.network,
            //   walletAddress: address,
            //   price: currentPrice,
            //   lastPrice: lastPrice,
            //   historicalBalance: historicalBalances,
            //   historicalPrice: relevantPrices,
            //   historicalWorth: historicalWorth,
            // };
            if(item.contract_name === 'AeFX.io' ) { //hardcoded scam coin w price quote in Covalent for some reason
              return;
            }
            if(dailyNWMonth[item.timestamp]){
              dailyNWMonth[item.timestamp] =  dailyNWMonth[item.timestamp] + ((item.close.balance / (10 ** item.contract_decimals)) * item.quote_rate);
            } else {
              dailyNWMonth[item.timestamp] = (item.close.balance / (10 ** item.contract_decimals)) * item.quote_rate;
            }
          })

          // return false;
        })
        console.log(chain);
        console.log(dailyNWMonth);

        // const balances: {
        //   balance: string;
        //   decimals: string;
        //   symbol: string;
        //   name: string;
        // }[] = await Moralis.Web3API.account.getTokenBalances(options);

        // // Native token
        // balances.push({
        //   balance: nativeBalance.balance,
        //   symbol: chain.symbol,
        //   decimals: chain.decimals,
        //   name: chain.name,
        // });

        // balances.forEach(async (rawToken) => {
        //   const balance = parseInt(rawToken.balance) / 10 ** parseInt(rawToken.decimals);
        //   let price = 0;
        //   let lastPrice = 0;
        //   try {
        //     const historicalPrices = await getCoinPriceFromName(rawToken.name, rawToken.symbol);
        //     // TODO: Add historical price to redux
        //     price = historicalPrices[historicalPrices.length - 1][1];
        //     lastPrice = historicalPrices[historicalPrices.length - 2][1];
        //   } catch (e) {
        //     console.error(e);
        //   }

        //   const token: IToken = {
        //     walletAddress: address,
        //     walletName: 'Metamask',
        //     network: chain.network,
        //     balance: balance,
        //     price: price,
        //     lastPrice: lastPrice,
        //     symbol: rawToken.symbol,
        //     name: rawToken.name,
        //   };

        //   dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: token });
        // });
      })

    );
  };

  const getMoralisData = async (address: string) => {
    const tokens: IToken[] = [];
    await Promise.all(
      SUPPORTED_CHAINS.map(async (chain) => {
        //Get metadata for one token
        const options = {
          chain: chain.network as any,
          address: address,
        };
        const nativeBalance = await Moralis.Web3API.account.getNativeBalance(options);
        const balances: {
          balance: string;
          decimals: string;
          symbol: string;
          name: string;
        }[] = await Moralis.Web3API.account.getTokenBalances(options);

        // Native token
        balances.push({
          balance: nativeBalance.balance,
          symbol: chain.symbol,
          decimals: chain.decimals,
          name: chain.name,
        });

        balances.forEach(async (rawToken) => {
          const balance = parseInt(rawToken.balance) / 10 ** parseInt(rawToken.decimals);
          let price = 0;
          let lastPrice = 0;
          try {
            const historicalPrices = await getCoinPriceFromName(rawToken.name, rawToken.symbol);
            // TODO: Add historical price to redux
            price = historicalPrices[historicalPrices.length - 1][1];
            lastPrice = historicalPrices[historicalPrices.length - 2][1];
          } catch (e) {
            console.error(e);
          }

          const token: IToken = {
            walletAddress: address,
            walletName: 'Metamask',
            network: chain.network,
            balance: balance,
            price: price,
            lastPrice: lastPrice,
            symbol: rawToken.symbol,
            name: rawToken.name,
          };

          dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: token });
        });
      })
    );
  };

  const getHistoricalBalances = async (
    address: string,
    chain: Chain
  ): Promise<{
    balances: TokenBalance[];
    tokenMetadata: TokenMetadata;
  }> => {
    const tokenMetadata: TokenMetadata = {};
    let balances: TokenBalance[] = [];
    for (let priceTimestamp of coinGeckoTimestamps) {
      const toBlock = await getMoralisDateToBlock(chain.network, priceTimestamp.toString());
      try {
        const currentBalances = (
          await getHistoricalBalanceFromMoralis(chain.network, address, toBlock.block)
        ).map((balance: any) => {
          if (!tokenMetadata[balance.token_address]) {
            tokenMetadata[balance.token_address] = {
              ...balance,
            };
          }

          const balanceAmount = +balance.balance;
          const balanceDecimals = +balance.decimals;
          return {
            balance: balanceAmount / 10 ** balanceDecimals,
            timestamp: priceTimestamp,
            tokenAddress: balance.token_address,
          };  
        });
        balances = balances.concat(currentBalances);

        const nativeBalance:any = getHistoricalNativeBalanceFromMoralis(
          chain.network,
          address,
          toBlock.block
        );
        const nativeBalanceAmount = +nativeBalance.balance;
        balances.push({
          balance: nativeBalanceAmount / 10 ** +chain.decimals,
          timestamp: priceTimestamp,
          tokenAddress: 'native',
        });
        if (!tokenMetadata['native']) {
          tokenMetadata['native'] = {
            symbol: chain.symbol,
            name: chain.name,
            decimals: chain.decimals,
          };
        }
      } catch (e: any) {
        console.error(e);
      }
    }
    return { balances, tokenMetadata };
  };

  const getAllData = async (address: string) => {
    let allBalances: TokenBalance[] = [];
    let allTokenMetadata: TokenMetadata = {};
    const allTokens: any[] = [];
    await Promise.all(
      SUPPORTED_CHAINS.map(async (chain) => {
        const { balances, tokenMetadata } = await getHistoricalBalances(address, chain);
        allBalances = allBalances.concat(balances);
        allTokenMetadata = merge(allTokenMetadata, tokenMetadata);
        for (const [tokenAddress, metadata] of Object.entries(tokenMetadata)) {
          allTokens.push({
            symbol: metadata.symbol,
            name: metadata.name,
            network: chain.name,
            historicalBalance: allBalances.filter((balance) => balance.tokenAddress === tokenAddress),
          });
      }
    }))
    // for (let chain of SUPPORTED_CHAINS) {
    //   const { balances, tokenMetadata } = getHistoricalBalances(address, chain);
    //   allBalances = allBalances.concat(balances);
    //   allTokenMetadata = merge(allTokenMetadata, tokenMetadata);
    //   for (const [tokenAddress, metadata] of Object.entries(tokenMetadata)) {
    //     allTokens.push({
    //       symbol: metadata.symbol,
    //       name: metadata.name,
    //       network: chain.name,
    //       historicalBalance: allBalances.filter((balance) => balance.tokenAddress === tokenAddress),
    //     });
    //   }
    // }

    // Get prices and merge
    allTokens.map(async (token) => {
      const tokenName = token.name;
      const tokenSymbol = token.symbol;
      const historicalBalances: TokenBalance[] = token.historicalBalance;
      const currentBalance = historicalBalances[historicalBalances.length - 1].balance;
      const currentTimestamp = historicalBalances[historicalBalances.length - 1].timestamp;
      try {
        const rawHistoricalPrices = await getCoinPriceFromName(tokenName, tokenSymbol);
        const historicalPrices = rawHistoricalPrices.map((historicalPrice: number[]) => {
          const timestamp = Math.floor(historicalPrice[0] / 1000);
          const price = historicalPrice[1];
          return { timestamp, price };
        });
        const balanceTimestamps = historicalBalances.map(
          (balance: TokenBalance) => balance.timestamp
        );
        const relevantPrices = historicalPrices.filter((price) =>
          balanceTimestamps.includes(price.timestamp)
        );
        const historicalWorth = relevantPrices.map((price) => {
          const balance = historicalBalances.find(
            (balance: TokenBalance) => price.timestamp === balance.timestamp
          );
          if (!balance) {
            throw new Error('Timestamp mismatch');
          }
          const worth = balance.balance * price.price;
          return { worth, timestamp: price.timestamp };
        });
        const currentPrice = historicalPrices[historicalPrices.length - 1].price;
        const lastPrice = historicalPrices[historicalPrices.length - 2].price;

        relevantPrices.push({ price: currentPrice, timestamp: currentTimestamp });
        historicalWorth.push({ worth: currentPrice * currentBalance, timestamp: currentTimestamp });

        const completeToken: IToken = {
          walletName: 'metamask',
          balance: currentBalance,
          symbol: token.symbol,
          name: token.name,
          network: token.network,
          walletAddress: address,
          price: currentPrice,
          lastPrice: lastPrice,
          historicalBalance: historicalBalances,
          historicalPrice: relevantPrices,
          historicalWorth: historicalWorth,
        };
        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      } catch (e) {
        const completeToken: IToken = {
          walletName: 'metamask',
          balance: currentBalance,
          symbol: token.symbol,
          name: token.name,
          network: token.network,
          walletAddress: address,
          historicalBalance: historicalBalances,
        };
        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      }
    });
  };

  const ethEnabled = async () => {
    if (typeof window.ethereum !== 'undefined') {
      // Instance web3 with the provided information from the MetaMask provider information
      web3 = new Web3(window.ethereum);
      try {
        // Request account access
        await window.ethereum.enable();

        return true;
      } catch (e) {
        // User denied access
        return false;
      }
    }

    return false;
  };

  const onClickConnect = async () => {
    if (await !ethEnabled()) {
      alert('Please install MetaMask to use this whoosh!');
    }

    setWeb3Enabled(true);

    const accs = await web3.eth.getAccounts();

    await Promise.all(
      accs.map(async (address: string) => {
        getMoralisData(address);
        getAllData(address);
        // getMonthHistorical(address);
        localStorage.setItem('metamaskAddress', address);
      })
    );
  };

  //TODO: need to find Form Event type for TS
  const onClickConnectFromInput = async (e: any) => {
    e.preventDefault();

    if (await !ethEnabled()) {
      alert('Please install MetaMask to use this whoosh!');
    }

    const addr: string = e.target.address.value;
    if (web3.utils.isAddress(addr)) {
      localStorage.setItem('metamaskAddress', addr);
      setWeb3Enabled(true);
      getMoralisData(addr);
      getAllData(addr);
      // getMonthHistorical(addr);

    } else {
      alert('Invalid Metamask Address');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('metamaskAddress') !== null) {
      const addr: string = String(localStorage.getItem('metamaskAddress'));
      setWeb3Enabled(true);
      getMoralisData(addr);
      getAllData(addr);
      // getMonthHistorical(addr);

    }
  }, []);

  return (
    <div className="App">
      <div>
        {!web3Enabled && (
          <div>
            <button onClick={onClickConnect}>Connect Metamask</button>
            <form onSubmit={onClickConnectFromInput}>
              <input type="text" name="address" placeholder="or paste MM address here" />
              <button type="submit">Submit</button>
            </form>
          </div>
        )}
      </div>
      <div>{web3Enabled && <div>✅ Metamask connected</div>}</div>
    </div>
  );
};

export default Metamask;
