import { useState, useEffect, useContext } from 'react';
import { Button, Accordion } from 'react-bootstrap';
import Moralis from 'moralis';
import { components } from 'moralis/types/generated/web3Api';

import Web3 from 'web3';

import * as actionTypes from 'src/store/actionTypes';
import { getCoinPriceFromName, getCovalentHistorical } from 'src/utils/prices';
import { useDispatch, useSelector } from 'react-redux';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';

import { getUnixTime } from 'date-fns';
import { ScamCoins, WALLETS, NETWORKS, LOCAL_STORAGE_KEYS } from 'src/utils/constants';
import { captureMessage } from '@sentry/react';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData } from 'src/services/firebase';
import { isWalletInRedux } from 'src/utils/wallets';

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

interface TokenContract {
  contract_address: string;
  contract_decimals: number;
  contract_name: string;
  contract_ticker_symbol: string;
  holdings: TokenHolding[];
}

interface TokenHolding {
  close: {
    balance: number;
    quote: number;
  };
  quote_rate: number;
  timestamp: string; // in ISO date (2021-12-24T00:00:00Z)
}

const SUPPORTED_CHAINS: Chain[] = [
  {
    network: NETWORKS.ETHEREUM,
    symbol: 'ETH',
    name: 'ethereum',
    decimals: '18',
    covalentId: '1',
  },
  {
    network: NETWORKS.BINANCE_SMART_CHAIN,
    symbol: 'BNB',
    name: 'binance',
    decimals: '18',
    covalentId: '56',
  },
  {
    network: NETWORKS.POLYGON,
    symbol: 'MATIC',
    name: 'matic',
    decimals: '18',
    covalentId: '137',
  },
  {
    network: NETWORKS.AVALANCHE,
    symbol: 'AVAX',
    name: 'avalanche',
    decimals: '18',
    covalentId: '43114',
  },
  {
    network: NETWORKS.FANTOM,
    symbol: 'FTM',
    name: 'fantom',
    decimals: '18',
    covalentId: '250',
  },
];

const Metamask = () => {
  const dispatch = useDispatch();
  const [walletsConnected, setWalletsConnected] = useState<string[]>([]);
  const user = useContext(AuthContext);
  const tokens = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);

  let web3: Web3 = new Web3();

  useEffect(() => {
    const metamaskAddress = localStorage.getItem('metamaskAddress');

    if (metamaskAddress) {
      const access = { metamaskAddress };
      if (user) addUserAccessData(user, access);
    }
  }, [user]);

  const coinGeckoTimestamps = getCoinGeckoTimestamps();

  const getMonthHistorical = async (address: string) => {
    for (let chain of SUPPORTED_CHAINS) {
      const dailyBalancesMonth = await getCovalentHistorical(chain.covalentId, address);
      const tokenContracts: TokenContract[] = dailyBalancesMonth.items.filter(
        (token: { contract_name: string }) => !ScamCoins.includes(token.contract_name)
      );
      for (let token of tokenContracts) {
        const historicalWorth = token.holdings
          .filter((holding: TokenHolding) => {
            const utcHold = getUnixTime(new Date(holding.timestamp));
            return coinGeckoTimestamps.includes(utcHold);
          })
          .map((holding: TokenHolding) => ({
            worth: (holding.close.balance / 10 ** token.contract_decimals) * holding.quote_rate,
            timestamp: getUnixTime(new Date(holding.timestamp)),
          }));

        const completeToken: IToken = {
          walletName: WALLETS.METAMASK,
          balance: 0,
          symbol: token.contract_ticker_symbol,
          name: token.contract_name,
          network: chain.name,
          walletAddress: address,
          price: 0,
          lastPrice: 0,
          historicalBalance: [],
          historicalPrice: [],
          historicalWorth,
        };
        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      }
    }
  };

  const getMoralisData = async (address: string) => {
    for (let chain of SUPPORTED_CHAINS) {
      // Get metadata for one token
      const options = {
        chain: chain.network as components['schemas']['chainList'],
        address,
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

      for (let rawToken of balances) {
        if (ScamCoins.includes(rawToken.name)) continue;
        const balance = parseInt(rawToken.balance) / 10 ** parseInt(rawToken.decimals);
        let price = 0;
        let lastPrice = 0;
        try {
          const historicalPrices = await getCoinPriceFromName(rawToken.name, rawToken.symbol);
          price = historicalPrices[historicalPrices.length - 1][1];
          lastPrice = historicalPrices[historicalPrices.length - 2][1];
        } catch (e) {
          captureMessage(`getCoinPriceFromName() failed\n${e}`);
        }

        const token: IToken = {
          walletAddress: address,
          walletName: WALLETS.METAMASK,
          network: chain.network,
          balance: balance,
          price,
          lastPrice,
          symbol: rawToken.symbol,
          name: rawToken.name,
        };

        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: token });
      }
    }
  };

  const ethEnabled = async (): Promise<boolean> => {
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

  const getNewMetamaskAddresses = (newAddresses: string[]): string[] => {
    const storedAddresses = localStorage.getItem(LOCAL_STORAGE_KEYS.METAMASK_ADDRESSES);

    let newKeys: string[] = [];
    if (!storedAddresses) {
      newKeys = [...newAddresses];
    } else {
      const prevAddresses = JSON.parse(storedAddresses);
      newAddresses.forEach((newAddress) => {
        if (!prevAddresses.includes(newAddress)) {
          newKeys = [...prevAddresses, newAddress];
        }
      });
    }
    return newKeys;
  };

  const onClickConnect = async () => {
    if (await !ethEnabled()) {
      alert('Please install MetaMask to use this whoosh!');
    }

    const accs = await web3.eth.getAccounts();
    const newWallets = getNewMetamaskAddresses(accs);
    setWalletsConnected(newWallets);
    localStorage.setItem(LOCAL_STORAGE_KEYS.METAMASK_ADDRESSES, JSON.stringify(newWallets));
  };

  const onClickConnectFromInput = async (e: any) => {
    e.preventDefault();

    if (await !ethEnabled()) {
      alert('Please install MetaMask to use this whoosh!');
    }

    const addr: string = e.target.address.value;
    if (web3.utils.isAddress(addr)) {
      const newWallets = getNewMetamaskAddresses([addr]);
      setWalletsConnected(newWallets);
      localStorage.setItem(LOCAL_STORAGE_KEYS.METAMASK_ADDRESSES, JSON.stringify(newWallets));
    } else {
      alert('Invalid Metamask Address');
    }
  };

  useEffect(() => {
    const getAllData = async () => {
      const newWallets = walletsConnected.filter((wallet) => !isWalletInRedux(tokens, wallet));
      for (let address of newWallets) {
        await getMoralisData(address);
      }
      for (let address of newWallets) {
        await getMonthHistorical(address);
      }
    };
    getAllData();
    // eslint-disable-next-line
  }, [walletsConnected, tokens]);

  useEffect(() => {
    const storedAddresses = localStorage.getItem(LOCAL_STORAGE_KEYS.METAMASK_ADDRESSES);
    if (storedAddresses !== null) {
      const addresses: string[] = JSON.parse(storedAddresses);
      setWalletsConnected(addresses);
    }
  }, []);

  return (
    <div className="App">
      <div>
        <Accordion>
          <Accordion.Item eventKey="0" style={{ backgroundColor: 'transparent' }}>
            <Accordion.Button
              className="App"
              style={{ backgroundColor: 'transparent', padding: '8px', marginLeft: '10px' }}
            >
              <div>
                <img
                  src={`https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg`}
                  height="24px"
                  width="24px"
                  alt=""
                />{' '}
                {walletsConnected.length !== 0 ? (
                  <span> Metamask wallets connected: {walletsConnected.length} </span>
                ) : (
                  <span> Connect Metamask</span>
                )}
              </div>
            </Accordion.Button>
            <Accordion.Body>
              <div>
                <Button variant="outline-light" onClick={onClickConnect}>
                  Connect Metamask
                </Button>
                <br />
                <form onSubmit={onClickConnectFromInput}>
                  <input type="text" name="address" placeholder="Add MM address" />
                  <Button variant="outline-secondary" type="submit">
                    Submit
                  </Button>
                </form>
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
};

export default Metamask;
