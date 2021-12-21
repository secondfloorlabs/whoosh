import { useState, useEffect } from 'react';
import Moralis from 'moralis';

import Web3 from 'web3';

import * as actionTypes from 'src/store/actionTypes';
import { getCoinPriceFromName, getHistoricalBalanceFromMoralis, getHistoricalNativeBalanceFromMoralis, getMoralisDateToBlock } from 'src/utils/prices';
import { useDispatch } from 'react-redux';
import { WALLETS } from 'src/utils/constants';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';

/* Moralis init code */
const serverUrl = 'https://pbmzxsfg3wj1.usemoralis.com:2053/server';
const appId = 'TcKOpTzYpLYgcelP2i21aJpclyAMiLUvRG5H5Gng';
Moralis.start({ serverUrl, appId });

interface Chain {
  network: string;
  symbol: string;
  name: string;
  decimals: string;
  /* Average seconds per block */
  blocktime: number;
  /* Static point to determine which block the chain is on */
  anchor: {
    block: number;
    timestamp: number;
  };
}

interface TokenMetadata {
  [tokenAddress: string]: {
    decimals: string;
    symbol: string;
    name: string;
  };
}

const SUPPORTED_CHAINS: Chain[] = [
  {
    network: 'eth',
    symbol: 'ETH',
    name: 'ethereum',
    decimals: '18',
    blocktime: 13.5,
    anchor: { block: 13838135, timestamp: 1639951318 },
  },
  {
    network: 'bsc',
    symbol: 'BNB',
    name: 'binance',
    decimals: '18',
    blocktime: 3.05,
    anchor: { block: 13622800, timestamp: 1639951359 },
  },
  {
    network: 'polygon',
    symbol: 'MATIC',
    name: 'matic',
    decimals: '18',
    blocktime: 2.3,
    anchor: { block: 22725372, timestamp: 1639951401 },
  },
  {
    network: 'avalanche',
    symbol: 'AVAX',
    name: 'avalanche',
    decimals: '18',
    blocktime: 5,
    anchor: { block: 8458882, timestamp: 1639951435 },
  },
  {
    network: 'fantom',
    symbol: 'FTM',
    name: 'fantom',
    decimals: '18',
    blocktime: 1.3,
    anchor: { block: 25456723, timestamp: 1639951459 },
  },
];

const coinGeckoTimestamps = getCoinGeckoTimestamps();

const Metamask = () => {
  const dispatch = useDispatch();
  const [web3Enabled, setWeb3Enabled] = useState(false);

  let web3: Web3 = new Web3();

  const _old_getHistoricalBalances = async (
    chain: Chain,
    address: string,
    tokenAddress: string,
    historicalPrices: { price: number; timestamp: number }[]
  ): Promise<{ balance: number; timestamp: number }[]> => {
    return await Promise.all(
      historicalPrices.map(async (price) => {
        const priceTimestamp = price.timestamp;
        const secondsBeforeAnchor = chain.anchor.timestamp - priceTimestamp / 1000;
        const blocksBeforeAnchor = secondsBeforeAnchor / chain.blocktime;
        const blockOptions = { chain: chain.network as any, date: priceTimestamp.toString() };

        // const toBlock = Math.round(chain.anchor.block - blocksBeforeAnchor);
        const toBlock = await Moralis.Web3API.native.getDateToBlock(blockOptions);

        const options = { chain: chain.network as any, address, to_block: Number(toBlock) };
        try {
          const balances = await Moralis.Web3API.account.getTokenBalances(options);
          console.log(balances);
          const tokenBalance = balances.find((balance) => balance.token_address === tokenAddress);
          console.log(tokenBalance);
          const decimals = tokenBalance ? +tokenBalance?.decimals : 18;
          const balance = tokenBalance ? +tokenBalance?.balance : 0;
          return { balance: balance / 10 ** decimals, timestamp: priceTimestamp };
        } catch (e: any) {
          console.error(e);
          console.error(e.error.toString());
        }
        return { balance: 0, timestamp: priceTimestamp };
      })
    );
  };

  const getHistoricalBalances = async (
    address: string,
    chain: Chain
  ): Promise<{
    balances: { balance: number; timestamp: number; tokenAddress: string }[];
    tokenMetadata: TokenMetadata;
  }> => {
    const tokenMetadata: TokenMetadata = {};
    const balances: { balance: number; timestamp: number; tokenAddress: string }[] = [];
    for (let priceTimestamp of coinGeckoTimestamps) {
      const secondsBeforeAnchor = chain.anchor.timestamp - priceTimestamp / 1000;
      const blocksBeforeAnchor = secondsBeforeAnchor / chain.blocktime;
      // const blockOptions = { chain: chain.network as any, date: priceTimestamp.toString() };
      // const toBlock = Math.round(chain.anchor.block - blocksBeforeAnchor);
      // const toBlock = await Moralis.Web3API.native.getDateToBlock(blockOptions);
      const toBlock = await getMoralisDateToBlock(chain.network, priceTimestamp.toString());
      console.log(toBlock);

      // const options = { chain: chain.network as any, address, to_block: Number(toBlock) };
      try {
        const currentBalances = (await getHistoricalBalanceFromMoralis(chain.network, address, toBlock.block)).map(
          (balance:any) => {
            if (!tokenMetadata[balance.token_address]) {
              tokenMetadata[balance.token_address] = {
                ...balance,
              };
            }

            console.log(balance);
            const balanceAmount = +balance.balance; 
            const balanceDecimals = +balance.decimals;
            return {
              balance: balanceAmount / 10 ** balanceDecimals,
              timestamp: priceTimestamp,
              tokenAddress: balance.token_address,
            };
          }
        );
        balances.concat(currentBalances); //not sure how this concat is playing out rn
        console.log(balances);

        const nativeBalance = await getHistoricalNativeBalanceFromMoralis(chain.network, address, toBlock.block);
        const nativeBalanceAmount = +nativeBalance.balance;
        balances.push({
          balance: nativeBalanceAmount / 10 ** +chain.decimals,
          timestamp: priceTimestamp,
          tokenAddress: 'native',
        });
        // Native token
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
      SUPPORTED_CHAINS.map(async (chain) => {
        await getChainData(address, chain);
      });
  };

  const getChainData = async (address: string, chain: Chain) => {
    const currentBalances = await getHistoricalBalances(address, chain);
    console.log(currentBalances);
  };

  const getCurrentTokenBalances = async (address: string, chain: Chain) => {
    // Get current native balance
    // Get current token balance
    // Join

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
      token_address: string;
    }[] = await Moralis.Web3API.account.getTokenBalances(options);

    // Native token
    balances.push({
      balance: nativeBalance.balance,
      symbol: chain.symbol,
      decimals: chain.decimals,
      name: chain.name,
      token_address: 'native',
    });
    return balances;
  };

  // const getMoralisData = async (address: string) => {
  //   const tokens: IToken[] = [];
  //   await Promise.all(
  //     SUPPORTED_CHAINS.map(async (chain) => {
  //       //Get metadata for one token

  //       const balances = await getCurrentTokenBalances(address, chain);

  //       balances.forEach(async (rawToken) => {
  //         const balance = parseInt(rawToken.balance) / 10 ** parseInt(rawToken.decimals);
  //         let price = 0;
  //         let historicalPrices: { price: number; timestamp: number }[] = [];
  //         let historicalBalances;
  //         let historicalWorth;
  //         try {
  //           const rawHistoricalPrices = await getCoinPriceFromName(rawToken.name, rawToken.symbol);
  //           historicalPrices = rawHistoricalPrices.map((historicalPrice: number[]) => {
  //             const timestamp = historicalPrice[0];
  //             const price = historicalPrice[1];
  //             return { timestamp, price };
  //           });
  //           // TODO: Add historical price to redux
  //           price = historicalPrices[rawHistoricalPrices.length - 1].price;

  //           historicalPrices = historicalPrices.slice(0, 10);
  //           historicalBalances = await getHistoricalBalances(
  //             chain,
  //             address,
  //             rawToken.token_address,
  //             historicalPrices
  //           );

  //           historicalWorth = historicalBalances.map((balance, index) => {
  //             return {
  //               worth: balance.balance * historicalPrices[index].price,
  //               timestamp: balance.timestamp,
  //             };
  //           });
  //           console.log(historicalWorth);
  //         } catch (e) {
  //           console.error(e);
  //         }

  //         const token: IToken = {
  //           walletAddress: address,
  //           walletName: WALLETS.METAMASK,
  //           network: chain.network,
  //           balance: balance,
  //           currentPrice: price,
  //           symbol: rawToken.symbol,
  //           name: rawToken.name,
  //           historicalPrice: historicalPrices,
  //           historicalBalance: historicalBalances,
  //           historicalWorth: historicalWorth,
  //         };

  //         dispatch({ type: actionTypes.ADD_TOKEN, token: token });
  //       });
  //     })
  //   );
  // };

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
        // getMoralisData(address);
        getAllData(address);
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
      // await getMoralisData(addr);
      await getAllData(addr);
    } else {
      alert('Invalid Metamask Address');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('metamaskAddress') != null) {
      const addr: string = String(localStorage.getItem('metamaskAddress'));
      setWeb3Enabled(true);
      // getMoralisData(addr);
      getAllData(addr);
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
