import { useState, useEffect, useContext } from 'react';
import { Button, FormControl, InputGroup, Accordion } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { captureMessage } from '@sentry/react';
import * as solanaWeb3 from '@solana/web3.js';
import * as actionTypes from 'src/store/actionTypes';

import { getCoinPriceFromId, getSolanaTokenAccounts } from 'src/utils/prices';
import { WALLETS, NETWORKS, LOCAL_STORAGE_KEYS, SOL_PER_LAMPORT } from 'src/utils/constants';
import { getCoinGeckoTimestamps } from 'src/utils/coinGeckoTimestamps';
import { mapClosestTimestamp } from 'src/utils/helpers';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData } from 'src/services/firebase';
import {
  SolanaTokenAccount,
  SolanaTransaction,
  SplToken,
  StakedAccount,
  TokenBalance,
  TokenMetadata,
} from 'src/interfaces/solana';
import {
  getDetailedTxs,
  getSolanaStakeAccounts,
  NATIVE_TOKEN,
  STAKED_SOL,
} from 'src/services/solana';
import { SPL_TOKENS } from 'src/utils/solanaCoinList';
import { isWalletInRedux } from 'src/utils/wallets';

const coinGeckoTimestamps = getCoinGeckoTimestamps();
const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');

const Solana = () => {
  const dispatch = useDispatch();
  const [solanaWallet, setSolanaWallet] = useState(false);
  const [walletsConnected, setWalletsConnected] = useState<string[]>([]);
  const user = useContext(AuthContext);
  const tokens = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);

  useEffect(() => {
    const solanaAddress = localStorage.getItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES);

    if (solanaAddress) {
      const access = { solanaAddress };
      if (user) addUserAccessData(user, access);
    }
  }, [user]);

  const getTokenMetadata = (
    tokenAccounts: SolanaTokenAccount[],
    stakedAccounts: string[]
  ): TokenMetadata => {
    const tokenMetadata: TokenMetadata = {};
    tokenMetadata['native'] = NATIVE_TOKEN;

    tokenAccounts.forEach((account) => {
      const splToken = SPL_TOKENS.find((token) => token.publicKey === account.tokenAddress);
      if (splToken) {
        tokenMetadata[account.tokenAddress] = { ...splToken };
      }
    });
    stakedAccounts.forEach((stakedAccount) => {
      tokenMetadata[stakedAccount] = STAKED_SOL;
    });
    return tokenMetadata;
  };

  const getBalancesFromTransactions = (
    transactionsAtPriceTimestamp: SolanaTransaction[],
    address: string,
    solTokenAccounts: string[],
    stakedAccounts: string[]
  ): { [tokenAddress: string]: number } => {
    let tokenBalances: { [tokenAddress: string]: number } = {};
    for (let transaction of transactionsAtPriceTimestamp) {
      const nativeAccountIndex = transaction.accounts.findIndex(
        (account: string) => account === address
      );
      tokenBalances['native'] = transaction.meta.postBalances[nativeAccountIndex] * SOL_PER_LAMPORT;

      stakedAccounts.forEach((stakedAccount) => {
        const stakedAccountIndex = transaction.accounts.findIndex(
          (account) => account === stakedAccount
        );
        if (stakedAccountIndex !== -1) {
          tokenBalances[stakedAccount] =
            transaction.meta.postBalances[stakedAccountIndex] * SOL_PER_LAMPORT;
        }
      });

      const postTokenBalances = transaction.meta.postTokenBalances;
      for (let balance of postTokenBalances) {
        const accountIndex = balance.accountIndex;
        const accountAddress = transaction.accounts[accountIndex];
        if (!solTokenAccounts.includes(accountAddress)) {
          continue;
        }
        tokenBalances[balance.mint] = +balance.uiTokenAmount.uiAmountString;
      }
    }
    return tokenBalances;
  };

  const getHistoricalBalances = async (
    address: string,
    stakedAccounts: string[]
  ): Promise<{
    balances: TokenBalance[];
    tokenMetadata: TokenMetadata;
  }> => {
    const balances: TokenBalance[] = [];
    const solTransactions = await getDetailedTxs(address, stakedAccounts, connection);

    const detailedSolTokenAccount = await getSolanaTokenAccounts(address);
    const solTokenAccounts = detailedSolTokenAccount.map((account) => account.tokenAccount);

    const tokenMetadata = getTokenMetadata(detailedSolTokenAccount, stakedAccounts);
    for (let timestamp of coinGeckoTimestamps) {
      const transactionsAtPriceTimestamp = solTransactions.filter(
        (transaction: any) => transaction.blockTime <= timestamp
      );

      const tokenBalances = getBalancesFromTransactions(
        transactionsAtPriceTimestamp,
        address,
        solTokenAccounts,
        stakedAccounts
      );

      for (const [tokenAddress, balance] of Object.entries(tokenBalances)) {
        balances.push({ balance, timestamp, tokenAddress });
      }
    }
    return { balances, tokenMetadata };
  };

  const mergePrices = async (
    address: string,
    allTokens: {
      symbol: string;
      name: string;
      coinGeckoId: string;
      historicalBalance: TokenBalance[];
    }[]
  ) => {
    allTokens.map(async (token) => {
      const tokenGeckoId = token.coinGeckoId;
      const historicalBalances: TokenBalance[] = token.historicalBalance;
      const currentBalance =
        historicalBalances.length === 0
          ? 0
          : historicalBalances[historicalBalances.length - 1].balance;
      try {
        const rawHistoricalPrices = await getCoinPriceFromId(tokenGeckoId);
        const historicalPrices = rawHistoricalPrices.map((historicalPrice: number[]) => {
          const timestamp = Math.floor(historicalPrice[0] / 1000);
          const price = historicalPrice[1];
          return { timestamp, price };
        });
        // Find closest price
        // Include if the coingecko price is closest one to given historicalPrice
        const relevantPrices = mapClosestTimestamp(historicalPrices, historicalBalances);
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

        const completeToken: IToken = {
          walletName: WALLETS.PHANTOM,
          balance: currentBalance,
          symbol: token.symbol,
          name: token.name,
          network: NETWORKS.SOLANA,
          walletAddress: address,
          price: currentPrice,
          lastPrice,
          historicalBalance: historicalBalances,
          historicalPrice: relevantPrices,
          historicalWorth,
        };
        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      } catch (e) {
        captureMessage(String(e));
        const completeToken: IToken = {
          walletName: WALLETS.PHANTOM,
          balance: currentBalance,
          symbol: token.symbol,
          name: token.name,
          network: NETWORKS.SOLANA,
          walletAddress: address,
          historicalBalance: historicalBalances,
        };
        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      }
    });
  };

  const addCurrentSplTokenWorth = async (
    splToken: SplToken,
    tokenAddress: solanaWeb3.PublicKey,
    tokenAccount: SolanaTokenAccount
  ) => {
    try {
      const balance = tokenAccount.tokenAmount.uiAmount;
      if (balance !== 0) {
        const coinGeckoId = splToken.coinGeckoId;
        const symbol = splToken.symbol;
        const historicalPrices = await getCoinPriceFromId(coinGeckoId);
        const price = historicalPrices[historicalPrices.length - 1][1];
        const lastPrice = historicalPrices[historicalPrices.length - 2][1];

        dispatch({
          type: actionTypes.ADD_CURRENT_TOKEN,
          token: {
            ...tokenAccount,
            name: splToken.name,
            balance,
            symbol,
            price,
            lastPrice,
            walletAddress: tokenAddress.toString(),
            walletName: WALLETS.PHANTOM,
            network: NETWORKS.SOLANA,
          },
        });
      }
    } catch (err) {
      captureMessage(String(err));
    }
  };

  const getCurrentSolWorth = async (
    address: solanaWeb3.PublicKey
  ): Promise<{ balance: number; price: number; lastPrice: number }> => {
    const balance = await connection.getBalance(address);

    const sol = balance * SOL_PER_LAMPORT;
    let price: number, lastPrice: number;
    const historicalPrices = await getCoinPriceFromId(NETWORKS.SOLANA);
    price = historicalPrices[historicalPrices.length - 1][1];
    lastPrice = historicalPrices[historicalPrices.length - 2][1];

    return { balance: sol, price, lastPrice };
  };

  const connectSolana = async (pubKeys: string[], tokens: IToken[]) => {
    setSolanaWallet(true);
    setWalletsConnected(pubKeys);

    // Current worth
    for (let pubKey of pubKeys) {
      if (isWalletInRedux(tokens, pubKey)) {
        continue;
      }
      const address = new solanaWeb3.PublicKey(pubKey);
      let stakedAccounts: StakedAccount[] = [];
      try {
        const { balance, price, lastPrice } = await getCurrentSolWorth(address);

        const solToken: IToken = {
          walletAddress: address.toString(),
          walletName: WALLETS.PHANTOM,
          network: NETWORKS.SOLANA,
          symbol: NATIVE_TOKEN.symbol,
          name: NATIVE_TOKEN.name,
          balance,
          price,
          lastPrice,
        };
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: solToken });

        stakedAccounts = await getSolanaStakeAccounts(address.toString());
        for (let stakedAccount of stakedAccounts) {
          const solToken: IToken = {
            walletAddress: stakedAccount.address,
            walletName: WALLETS.PHANTOM,
            network: NETWORKS.SOLANA,
            balance: stakedAccount.balance,
            symbol: STAKED_SOL.symbol,
            name: STAKED_SOL.name,
            price,
            lastPrice,
          };

          dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: solToken });
        }
      } catch (e) {
        captureMessage(`Failed to get current SOL accounts ${e}`);
      }

      const tokenAccounts = await getSolanaTokenAccounts(pubKey);

      for (let splToken of SPL_TOKENS) {
        const tokenAccount = tokenAccounts.find(
          (tokenAccount) => tokenAccount.tokenAddress === splToken.publicKey
        );
        if (tokenAccount) {
          await addCurrentSplTokenWorth(splToken, address, tokenAccount);
        }
      }
    }

    // Historical worth
    for (let pubKey of pubKeys) {
      if (isWalletInRedux(tokens, pubKey)) {
        continue;
      }
      try {
        const stakedAccounts = await getSolanaStakeAccounts(pubKey);
        const stakedAccountAddresses = stakedAccounts.map((account) => account.address);
        const { balances, tokenMetadata } = await getHistoricalBalances(
          pubKey,
          stakedAccountAddresses
        );

        const allTokens = [];
        for (const [tokenAddress, metadata] of Object.entries(tokenMetadata)) {
          allTokens.push({
            symbol: metadata.symbol,
            name: metadata.name,
            coinGeckoId: metadata.coinGeckoId,
            historicalBalance: balances.filter((balance) => balance.tokenAddress === tokenAddress),
          });
        }
        mergePrices(pubKey, allTokens);
      } catch (err) {
        captureMessage(String(err));
      }
    }
  };

  const getNewSolanaAddresses = (newAddress: string): string[] => {
    const storedAddresses = localStorage.getItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES);

    let newKeys: string[] = [];
    if (!storedAddresses) {
      newKeys = [newAddress];
    } else {
      const prevAddresses = JSON.parse(storedAddresses);
      if (prevAddresses.includes(newAddress)) {
        newKeys = prevAddresses;
      } else {
        newKeys = [...prevAddresses, newAddress];
      }
    }
    return newKeys;
  };

  const connectSolanaFromWallet = async (tokens: IToken[]) => {
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      const newKeys: string[] = getNewSolanaAddresses(addr);
      localStorage.setItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES, JSON.stringify(newKeys));
      connectSolana(newKeys, tokens);
    } catch (err) {
      captureMessage(String(err));
    }
  };

  const connectSolanaFromInput = async (e: any, tokens: IToken[]) => {
    e.preventDefault();
    try {
      const addr = e.target.address.value;
      if (solanaWeb3.PublicKey.isOnCurve(addr)) {
        const pubKey = new solanaWeb3.PublicKey(addr).toString();
        const newKeys: string[] = getNewSolanaAddresses(pubKey);
        localStorage.setItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES, JSON.stringify(newKeys));
        connectSolana(newKeys, tokens);
      } else {
        alert('Invalid Sol address');
      }
    } catch (err) {
      captureMessage(String(err));
    }
  };

  useEffect(() => {
    const storedAddresses = localStorage.getItem(LOCAL_STORAGE_KEYS.SOLANA_ADDRESSES);
    if (storedAddresses !== null) {
      const addresses: string[] = JSON.parse(storedAddresses);

      connectSolana(addresses, tokens);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <div>
        <Accordion>
          <Accordion.Item eventKey="0" style={{backgroundColor:"transparent"}}>
            <Accordion.Button className="App" style={{backgroundColor:"transparent",padding:"8px",marginLeft:"10px"}}>
              <div>
                <img
                  src={`https://cryptologos.cc/logos/solana-sol-logo.png`}
                  height="24px"
                  width="24px"
                  alt=""
                />{" "}{walletsConnected.length !== 0 ? (<span> Solana wallets connected: {walletsConnected.length} </span>) : (<span> Connect Solana</span>)}
              </div>
            </Accordion.Button>
            <Accordion.Body>
              <div >
              <Button variant="outline-light" size="sm" onClick={() => connectSolanaFromWallet(tokens)}>
                Connect Phantom
              </Button>
              <form onSubmit={(e) => connectSolanaFromInput(e, tokens)}>
                <InputGroup size="sm">
                  <FormControl type="text" name="address" placeholder="Add Sol address" />
                  <Button variant="outline-secondary" type="submit">
                    Submit
                  </Button>
                </InputGroup>
               </form>
          
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>       
        
      </div>
      {/* {solanaWallet && <div>✅ Solana wallets connected: {walletsConnected.length} </div>} */}
    </div>
  );
};

export default Solana;
