import { useState } from 'react';
import axios from 'axios';
import Moralis from 'moralis';

import Web3 from 'web3';

import * as actionTypes from '../../store/actionTypes';
import { useSelector, useDispatch } from 'react-redux';

/* Moralis init code */
const serverUrl = 'https://kpj5khzr6blo.bigmoralis.com:2053/server';
const appId = 'JLjuW4YegAqjn2GAFSI9VX4G5LCSzumXK5AoCqpu';
Moralis.start({ serverUrl, appId });

const SUPPORTED_CHAINS = [
  { network: 'eth', symbol: 'ETH', name: 'ethereum', decimals: '18' },
  { network: 'bsc', symbol: 'BNB', name: 'binance', decimals: '18' },
  { network: 'polygon', symbol: 'MATIC', name: 'matic', decimals: '18' },
  { network: 'avalanche', symbol: 'AVAX', name: 'avalanche', decimals: '18' },
  { network: 'fantom', symbol: 'FTM', name: 'fantom', decimals: '18' },
];

const Metamask = () => {
  const dispatch = useDispatch();
  const [web3Enabled, setWeb3Enabled] = useState(false);
  const [ethBalance, setEthBalance] = useState(0);

  let web3: Web3 = new Web3();

  const wallets = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);
  console.log(wallets);

  const getCoinPrices = async (symbols: string[]) => {
    const ids = symbols.join(',');
    const response = await axios.get(
      `https://api.nomics.com/v1/currencies/ticker?key=345be943016fa1e2f6550e237d6fbf125ed7566f&ids=${ids}&convert=USD&per-page=100&page=1`
    );

    if (!response || response.data.length <= 0) {
      throw new Error('No coingecko price found for coins: ' + ids);
    }

    return response.data;
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
          let coinPrice = 0;
          // try {
          //   coinPrice = await getCoinPrice(rawToken.symbol);
          // } catch (e) {
          //   console.error(e);
          // }
          const token: IToken = {
            walletAddress: address,
            walletName: 'Metamask',
            network: chain.network,
            balance: parseInt(rawToken.balance) / 10 ** parseInt(rawToken.decimals),
            price: coinPrice,
            symbol: rawToken.symbol,
            name: rawToken.name,
          };

          if (token.symbol === 'ETH') {
            setEthBalance(token.balance * coinPrice);
          }
          tokens.push(token);
        });
      })
    );
    const symbols = tokens.map((rawToken: IToken) => {
      return rawToken.symbol;
    });
    const prices = await getCoinPrices(symbols);
    console.log(prices);
    // join prices to tokens
    const tokensWithPrice = tokens.map((token) => {
      const price = prices.find((p: { id: string }) => p.id === token.symbol)?.price;
      return {
        ...token,
        price,
      };
    });

    tokensWithPrice.forEach((token) => {
      dispatch({ type: actionTypes.ADD_TOKEN, token: token });
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
      })
    );
  };

  return (
    <div className="App">
      <div>{!web3Enabled && <button onClick={onClickConnect}>Connect Metamask</button>}</div>
      {/* <div>Eth Mainnet Balance: {ethBalance && <span>{ethBalance}</span>}</div> */}
      {/* <div>Eth Current Price: {ethPrice && <span>{ethPrice}</span>}</div> */}
      <div>
        Metamask Eth Mainnet Balance in USD: ${ethBalance && <span>{ethBalance.toFixed(2)}</span>}
      </div>
    </div>
  );
};

export default Metamask;
