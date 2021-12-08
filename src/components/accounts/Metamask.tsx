import { useEffect, useState } from 'react';
import axios from 'axios';
import tokenABI from '../../utils/tokenABI';
import Moralis from 'moralis';

import { AbiItem } from 'web3-utils';

import Web3 from 'web3';

import { addWallet } from '../../store/actionCreators';
import { useSelector, useDispatch } from 'react-redux';

/* Moralis init code */
const serverUrl = 'https://kpj5khzr6blo.bigmoralis.com:2053/server';
const appId = 'JLjuW4YegAqjn2GAFSI9VX4G5LCSzumXK5AoCqpu';
Moralis.start({ serverUrl, appId });

const SUPPORTED_CHAINS = ['eth', 'bsc', 'polygon', 'avalanche', 'fantom'];

const tokenAddresses = [
  {
    address: '0x04F2694C8fcee23e8Fd0dfEA1d4f5Bb8c352111F',
    token: 'sOHM',
  },
];

const Metamask = () => {
  const [web3Enabled, setWeb3Enabled] = useState(false);
  const [ethBalance, setEthBalance] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [ohmPrice, setOhmPrice] = useState(0);

  let web3: Web3 = new Web3();

  const wallets = useSelector<WalletState, WalletState['wallets']>((state) => state.wallets);
  console.log(wallets);

  useEffect(() => {
    //// NOTE: hardcoded CG routes for now -- eventually abstracted to helpers.ts
    const receiveCoinGeckoData = async () => {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum'
      );

      if (response) {
        setEthPrice(response.data[0].current_price);
      }
    };
    const receiveCoinGeckoOlympusData = async () => {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=olympus'
      );

      if (response) {
        setOhmPrice(response.data[0].current_price);
      }
    };
    const getMoralisData = async () => {
      SUPPORTED_CHAINS.forEach(async (chain) => {
        //Get metadata for one token
        const options = {
          chain: chain as any,
          address: '0x88832EA5997BD53fB6a134a7F4CfD959cc42Aded',
        };
        const nativeBalance = await Moralis.Web3API.account.getNativeBalance(options);
        console.log(nativeBalance);
        const balances = await Moralis.Web3API.account.getTokenBalances(options);
        console.log(balances);
        const wallet: IWallet = {
          wallet: 'metamask',
          address: '0x88832EA5997BD53fB6a134a7F4CfD959cc42Aded',
          network: chain,
          tokens: balances.map((token) => {
            return {
              balance: parseInt(token.balance) / parseInt(token.decimals),
              price: 10,
              symbol: token.symbol,
            };
          }),
        };
        addWallet(wallet);
      });
    };

    receiveCoinGeckoData();
    receiveCoinGeckoOlympusData();
    getMoralisData();
  }, []);

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

    console.log(accs);
    const newAccounts = await Promise.all(
      accs.map(async (address: string) => {
        const balance = await web3.eth.getBalance(address);
        console.log(balance);

        const tokenBalances = await Promise.all(
          tokenAddresses.map(async (token) => {
            const tokenInst = new web3.eth.Contract(tokenABI as AbiItem[], token.address);
            console.log(tokenInst);

            const balance = await tokenInst.methods.balanceOf(address).call();
            console.log(balance);
            return {
              token: token.token,
              balance,
            };
          })
        );

        return {
          address,
          ethBalance: +parseFloat(web3.utils.fromWei(balance, 'ether')),
          tokens: tokenBalances,
        };
      })
    );

    console.log(newAccounts);
    const wallet = newAccounts[0];
    const ethValue = wallet.ethBalance * ethPrice;
    const ohmValue = wallet.tokens[0].balance * 0.000000001 * ohmPrice;
    const WalletBalance = ethValue + ohmValue;
    setEthBalance(WalletBalance);
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
