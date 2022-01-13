import { useState, useEffect, useContext } from 'react';
import { Button, Accordion } from 'react-bootstrap';
import Moralis from 'moralis';
import { components } from 'moralis/types/generated/web3Api';

import Web3 from 'web3';

import * as actionTypes from 'src/store/actionTypes';
import {
  calculateProfitLoss,
  getCoinPriceFromName,
  getCovalentHistorical,
  getCovalentTokenTransactions,
  getCovalentTransactions,
  getHistoricalPrices,
} from 'src/utils/prices';
import { useDispatch, useSelector } from 'react-redux';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';

import { getUnixTime } from 'date-fns';
import { ScamCoins, WALLETS, NETWORKS, LOCAL_STORAGE_KEYS } from 'src/utils/constants';
import { captureException, captureMessage } from '@sentry/react';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData, getUserMetadata } from 'src/services/firebase';
import { isWalletInRedux } from 'src/utils/wallets';
import { User } from 'firebase/auth';
import { Mixpanel } from 'src/utils/mixpanel';
import { Chain, TokenContract, TokenHolding } from 'src/interfaces/metamask';
import { mapClosestTimestamp } from 'src/utils/helpers';
import { BalanceTimestamp, PriceTimestamp, CovalentTransferType } from 'src/interfaces/prices';

/* Moralis init code */
const serverUrl = 'https://pbmzxsfg3wj1.usemoralis.com:2053/server';
const appId = 'TcKOpTzYpLYgcelP2i21aJpclyAMiLUvRG5H5Gng';
Moralis.start({ serverUrl, appId });

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

const CQT_NATIVE_NAME_MAP = new Map<string, string>([
  ['Binance Coin', 'binance'],
  ['Fantom Token', 'fantom'],
  ['Ether', 'ethereum'],
  ['Avalanche Coin', 'avalanche'],
  ['Matic Token', 'matic'],
]);

const Metamask = () => {
  const dispatch = useDispatch();
  const [walletsConnected, setWalletsConnected] = useState<string[]>([]);
  const user = useContext(AuthContext);
  const tokens = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);

  let web3: Web3 = new Web3();

  const coinGeckoTimestamps = getCoinGeckoTimestamps();

  function getBalanceChanges(
    prices: { price: number; timestamp: number }[],
    balances: { balance: number; timestamp: number }[]
  ): { price: number; deltaBalance: number; timestamp: number }[] {
    const joinedBalancePrice = balances.map((balance) => {
      const price = prices.find((price) => balance.timestamp === price.timestamp);
      if (!price) {
        throw new Error('Timestamp mismatch');
      }
      return { ...balance, price: price.price };
    });

    const balanceChanges: {
      price: number;
      deltaBalance: number;
      timestamp: number;
    }[] = [];
    for (let i = 1; i < joinedBalancePrice.length; i++) {
      const current = joinedBalancePrice[i];
      const prev = joinedBalancePrice[i - 1];
      balanceChanges.push({
        deltaBalance: current.balance - prev.balance,
        // Average the 2 day's price to get the buy/sell price
        price: current.price + prev.price,
        timestamp: current.timestamp,
      });
    }
    return balanceChanges;
  }

  async function getNativeCoinTransactions(
    chain: Chain,
    walletAddress: string
  ): Promise<{ deltaBalance: number; deltaFiat: number }[]> {
    const transactions = (await getCovalentTransactions(chain.covalentId, walletAddress)).data
      .items;
    return transactions
      .filter((transaction) => transaction.successful)
      .filter((transaction) => transaction.value !== 0)
      .map((transaction) => {
        const isBuy = transaction.to_address?.toLowerCase() === walletAddress.toLowerCase();
        const balance = +transaction.value / 10 ** +chain.decimals;
        return {
          deltaBalance: isBuy ? balance : -balance,
          deltaFiat: isBuy ? transaction.value_quote : -transaction.value_quote,
        };
      });
  }

  function findClosestPriceFromTime(prices: PriceTimestamp[], timestamp: number): number {
    return prices.reduce(function (prev, curr) {
      return Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp)
        ? curr
        : prev;
    }).price;
  }

  async function getTokenTransactions(
    chainId: string,
    walletAddress: string,
    tokenAddress: string,
    prices: PriceTimestamp[]
  ): Promise<{ deltaBalance: number; deltaFiat: number }[]> {
    const tokenTransactions = (
      await getCovalentTokenTransactions(chainId, walletAddress, tokenAddress)
    ).data;
    const balanceChanges: { deltaBalance: number; deltaFiat: number }[] = [];

    tokenTransactions.items
      .filter((transactionItem) => transactionItem.successful)
      .map((transactionItem) => {
        transactionItem.transfers.map((tokenTransfer) => {
          const isBuy = tokenTransfer.transfer_type === CovalentTransferType.IN;
          const balance = +tokenTransfer.delta / 10 ** tokenTransfer.contract_decimals;

          const priceAtTime = findClosestPriceFromTime(
            prices,
            getUnixTime(new Date(tokenTransfer.block_signed_at))
          );

          balanceChanges.push({
            deltaBalance: isBuy ? balance : -balance,
            deltaFiat: isBuy ? balance * priceAtTime : -balance * priceAtTime,
          });
        });
      });
    return balanceChanges;
  }

  async function getProfitLossStats(
    chain: Chain,
    walletAddress: string,
    tokenAddress: string,
    isNativeCoin: boolean,
    prices: PriceTimestamp[],
    currentBalance: number,
    currentPrice: number
  ): Promise<
    | {
        totalBalanceBought: number;
        totalFiatBought: number;
        totalBalanceSold: number;
        totalFiatSold: number;
      }
    | undefined
  > {
    // const balanceChanges = getBalanceChanges(prices, balances);
    let balanceChanges: { deltaBalance: number; deltaFiat: number }[] = [];

    try {
      if (isNativeCoin) {
        balanceChanges = await getNativeCoinTransactions(chain, walletAddress);
      } else {
        balanceChanges = await getTokenTransactions(
          chain.covalentId,
          walletAddress,
          tokenAddress,
          prices
        );
      }
    } catch (e) {
      console.error(e);
      captureMessage(String(e));
      return undefined;
    }
    const allBuys = balanceChanges
      .filter((balanceChange) => balanceChange.deltaBalance > 0)
      .map((balanceChange) => {
        return {
          deltaBalance: balanceChange.deltaBalance,
          amountPaid: balanceChange.deltaFiat,
        };
      });
    const allSells = balanceChanges
      .filter((balanceChange) => balanceChange.deltaBalance < 0)
      .map((balanceChange) => {
        return {
          deltaBalance: balanceChange.deltaBalance,
          amountSold: balanceChange.deltaFiat,
        };
      });
    allSells.push({
      deltaBalance: -currentBalance,
      amountSold: -currentBalance * currentPrice,
    });

    const totalBalanceBought = allBuys.reduce((acc, curr) => acc + curr.deltaBalance, 0);
    const totalFiatBought = allBuys.reduce((acc, curr) => acc + curr.amountPaid, 0);
    const totalBalanceSold = allSells.reduce((acc, curr) => acc + curr.deltaBalance, 0);
    const totalFiatSold = allSells.reduce((acc, curr) => acc + curr.amountSold, 0);

    return { totalBalanceBought, totalFiatBought, totalBalanceSold, totalFiatSold };
  }

  const getMonthHistorical = async (address: string) => {
    for (let chain of SUPPORTED_CHAINS) {
      let dailyBalancesMonth = { items: [] };
      try {
        dailyBalancesMonth = await getCovalentHistorical(chain.covalentId, address);
      } catch (e) {
        captureMessage(String(e));
      }
      const tokenContracts: TokenContract[] = dailyBalancesMonth.items.filter(
        (token: { contract_name: string }) => !ScamCoins.includes(token.contract_name)
      );
      for (let token of tokenContracts) {
        try {
          const rawHistoricalPrices = await getCoinPriceFromName(
            token.contract_name,
            token.contract_ticker_symbol
          );
          const historicalPrices = getHistoricalPrices(rawHistoricalPrices);
          const currentPrice = historicalPrices[historicalPrices.length - 1].price;
          const currentHolding = token.holdings[token.holdings.length - 1];
          const currentBalance = +currentHolding.close.balance / 10 ** token.contract_decimals;

          const historicalBalances = token.holdings
            .filter((holding: TokenHolding) => {
              const utcHold = getUnixTime(new Date(holding.timestamp));
              return coinGeckoTimestamps.includes(utcHold);
            })
            .map((holding: TokenHolding) => ({
              balance: +holding.close.balance / 10 ** token.contract_decimals,
              timestamp: getUnixTime(new Date(holding.timestamp)),
            }));

          const relevantPrices = mapClosestTimestamp(historicalPrices, historicalBalances);
          const isNativeCoin = token.contract_ticker_symbol === chain.symbol;
          const profitLossStats = await getProfitLossStats(
            chain,
            address,
            token.contract_address,
            isNativeCoin,
            historicalPrices,
            currentBalance,
            currentPrice
          );
          const historicalWorth = relevantPrices.map((price) => {
            const historicalBalance = historicalBalances.find(
              (historicalBalance) => price.timestamp === historicalBalance.timestamp
            );
            if (!historicalBalance) {
              throw new Error('Timestamp mismatch');
            }
            const worth = historicalBalance.balance * price.price;
            return { worth, timestamp: price.timestamp };
          });
          const lastPrice = historicalPrices[historicalPrices.length - 2].price;

          const name = isNativeCoin
            ? CQT_NATIVE_NAME_MAP.get(token.contract_name) ?? token.contract_name
            : token.contract_name;

          console.log(token.contract_name);
          console.log(name);

          const completeToken: IToken = {
            walletName: WALLETS.METAMASK,
            balance: 0,
            symbol: token.contract_ticker_symbol,
            name: name,
            network: chain.network,
            walletAddress: address,
            price: currentPrice,
            lastPrice,
            historicalBalance: historicalBalances,
            historicalPrice: historicalPrices,
            historicalWorth,
            totalBalanceBought: profitLossStats?.totalBalanceBought,
            totalFiatBought: profitLossStats?.totalFiatBought,
            totalBalanceSold: profitLossStats?.totalBalanceSold,
            totalFiatSold: profitLossStats?.totalFiatSold,
          };
          dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
        } catch (e) {
          captureMessage(String(e));
        }
      }
    }
  };

  const getCurrentBalances = async (address: string) => {
    for (let chain of SUPPORTED_CHAINS) {
      try {
        // Get metadata for one token
        const options = {
          chain: chain.network as components['schemas']['chainList'],
          address,
        };
        let nativeBalance = { balance: '0' };
        try {
          nativeBalance = await Moralis.Web3API.account.getNativeBalance(options);
        } catch (e) {
          captureMessage(String(e));
        }
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
      } catch (e) {
        captureMessage(String(e));
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

    const access = { metamaskAddresses: JSON.stringify(newWallets) };
    if (user) addUserAccessData(user, access);
    Mixpanel.track('Connected MetaMask Wallet', { method: 'auto-ext' });
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

      const access = { metamaskAddresses: JSON.stringify(newWallets) };
      if (user) addUserAccessData(user, access);
      Mixpanel.track('Connected MetaMask Wallet', { method: 'manual' });
      //Mixpanel.people.set({ metamaskWallets: newWallets });
    } else {
      alert('Invalid Metamask Address');
    }
  };

  useEffect(() => {
    const getAllData = async () => {
      const newWallets = walletsConnected.filter((wallet) => !isWalletInRedux(tokens, wallet));
      for (let address of newWallets) {
        await getCurrentBalances(address);
      }
      for (let address of newWallets) {
        await getMonthHistorical(address);
      }
    };
    getAllData();
    // eslint-disable-next-line
  }, [walletsConnected]);

  useEffect(() => {
    const getAccountsLocalStorage = () => {
      const storedAddresses = localStorage.getItem(LOCAL_STORAGE_KEYS.METAMASK_ADDRESSES);
      if (storedAddresses !== null) {
        const addresses: string[] = JSON.parse(storedAddresses);
        setWalletsConnected(addresses);
      }
    };

    const getAccountsFirebase = async (user: User) => {
      const userMetadata = await getUserMetadata(user);

      // store user tokens in localstorage for multiple device sync
      if (userMetadata && userMetadata.access.metamaskAddresses) {
        const addresses: string[] = JSON.parse(userMetadata.access.metamaskAddresses);
        localStorage.setItem(LOCAL_STORAGE_KEYS.METAMASK_ADDRESSES, JSON.stringify(addresses));
        setWalletsConnected(addresses);
      }
    };

    if (user === undefined) {
      // not logged into firebase
      getAccountsLocalStorage();
    } else if (user === null) {
      // loading state
    } else {
      // logged into firebase
      getAccountsFirebase(user);
    }
  }, [user]);

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
