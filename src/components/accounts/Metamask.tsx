import { useState, useEffect } from 'react';
import Moralis from 'moralis';

import Web3 from 'web3';

import * as actionTypes from 'src/store/actionTypes';
import { getCoinPriceFromName } from 'src/utils/prices';
import { useDispatch } from 'react-redux';
import { WALLETS } from 'src/utils/constants';

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

  let web3: Web3 = new Web3();

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
          try {
            const historicalPrices = await getCoinPriceFromName(rawToken.name, rawToken.symbol);
            // TODO: Add historical price to redux
            price = historicalPrices[historicalPrices.length - 1][1];
          } catch (e) {
            console.error(e);
          }

          const token: IToken = {
            walletAddress: address,
            walletName: WALLETS.METAMASK,
            network: chain.network,
            balance: balance,
            price: price,
            symbol: rawToken.symbol,
            name: rawToken.name,
          };

          dispatch({ type: actionTypes.ADD_TOKEN, token: token });
        });
      })
    );
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
      await getMoralisData(addr);
    } else {
      alert('Invalid Metamask Address');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('metamaskAddress') != null) {
      const addr: string = String(localStorage.getItem('metamaskAddress'));
      setWeb3Enabled(true);
      getMoralisData(addr);
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
