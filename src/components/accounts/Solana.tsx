import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import * as solanaWeb3 from '@solana/web3.js';
import axios from 'axios';

import * as actionTypes from 'src/store/actionTypes';

import { getCoinPriceFromId, listSolanaTransactions, getSolanaTransaction } from 'src/utils/prices';
import { WALLETS, SOL_PER_LAMPORT } from 'src/utils/constants';

interface SplToken {
  publicKey: string;
  ticker: string;
  coinGeckoId: string;
}

const splTokens: SplToken[] = [
  {
    publicKey: 'GuPGtixpwQTPyN7xHyyT3TMvH1dsir248GQSoTxaAMMs',
    coinGeckoId: 'invictus',
    ticker: 'IN',
  },
  {
    publicKey: '9c98UD5dRCSJLk381yo9JNqn5fhiLpYnePE17tAucTP6',
    coinGeckoId: 'usd-coin',
    ticker: 'USDC',
  },
];

interface StakedAccountResponse {
  success: boolean;
  data: {
    address: {
      voter: string;
      amount: string;
      type: string;
      stakeAccount: string;
      staker: string;
      role: string[];
    };
  };
}

interface StakedAccount {
  balance: number;
  address: string;
}

const getSolanaStakeAccounts = async (address: string): Promise<StakedAccount[]> => {
  const response = await axios.get(`https://api.solscan.io/account/stake?address=${address}`);

  if (!response) console.log('No sol price found for coin: SOL');

  const stakedResponse: StakedAccountResponse = response.data;

  const stakedAccounts: StakedAccount[] = [];

  if (stakedResponse.success) {
    for (const [key, value] of Object.entries(stakedResponse.data)) {
      if (value.amount) {
        const stakedAccount = {
          balance: Number(value.amount) * SOL_PER_LAMPORT,
          address: value.stakeAccount,
        };
        stakedAccounts.push(stakedAccount);
      }
    }
  }
  return stakedAccounts;
};

const Solana = () => {
  const dispatch = useDispatch();
  const [solanaWallet, setSolanaWallet] = useState(false);

  const connectSolana = async (pubKey: solanaWeb3.PublicKey) => {
    try {
      const address = new solanaWeb3.PublicKey(pubKey);
      const addressStr = address.toString();

      let solTransactions = await listSolanaTransactions(addressStr);
      solTransactions = solTransactions.sort(
        (a: { blockTime: number }, b: { blockTime: number }) => {
          return a.blockTime - b.blockTime;
        }
      );
      console.log(solTransactions);
      // solTransactions = solTransactions.slice(0, 10);
      let solTotal = 0;
      let tokenMap: { [tokenAddress: string]: number } = {};
      for (let tx of solTransactions) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const transaction = await getSolanaTransaction(tx.txHash);
        if (transaction.status !== 'Success') {
          continue;
        }
        transaction.solTransfers.forEach(
          (solTransfer: { source: string; destination: string; amount: number }) => {
            if (solTransfer.destination === addressStr) {
              solTotal += solTransfer.amount * SOL_PER_LAMPORT;
            } else {
              solTotal -= solTransfer.amount * SOL_PER_LAMPORT;
            }
          }
        );
        for (let tokenBalance of transaction.tokenBalanes) {
          const tokenAddress = tokenBalance.token.tokenAddress;
          tokenMap[tokenAddress] = +tokenBalance.amount.postAmount;
        }
        solTotal -= transaction.fee * SOL_PER_LAMPORT;
        console.log(transaction);
      }
      console.log(tokenMap);
      console.log(solTotal);
      // console.log(splTransfers);

      const network = solanaWeb3.clusterApiUrl('mainnet-beta');
      const connection = new solanaWeb3.Connection(network, 'confirmed');
      setSolanaWallet(true);

      const balance = await connection.getBalance(address);

      const sol = balance * SOL_PER_LAMPORT;
      let price: number, lastPrice: number;
      try {
        const historicalPrices = await getCoinPriceFromId('solana');
        price = historicalPrices[historicalPrices.length - 1][1];
        lastPrice = historicalPrices[historicalPrices.length - 2][1];

        const solToken: IToken = {
          walletAddress: address.toString(),
          walletName: WALLETS.PHANTOM,
          network: 'Solana',
          balance: sol,
          symbol: 'SOL',
          name: 'Solana',
          price,
          lastPrice,
        };
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: solToken });

        const stakedAccounts = await getSolanaStakeAccounts(address.toString());

        const solTokens = stakedAccounts.map((stakedAccount) => {
          const solToken: IToken = {
            walletAddress: stakedAccount.address,
            walletName: WALLETS.PHANTOM,
            network: 'Solana',
            balance: stakedAccount.balance,
            symbol: 'SOL',
            name: 'Staked Solana',
            price,
            lastPrice,
          };
          return solToken;
        });

        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: [...solTokens] });
      } catch (e) {
        console.error(e);
      }

      const tokenAccounts = await connection.getTokenAccountsByOwner(address, {
        programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      tokenAccounts.value.forEach(async (token) => {
        const tokenKey = token.pubkey;
        const value = (await connection.getTokenAccountBalance(tokenKey)).value;
        if (value.amount !== '0' && value.decimals !== 0) {
          const balance = parseFloat(value.amount) / 10 ** value.decimals;
          const tokenMetadata = splTokens.find(
            (splToken) => splToken.publicKey === tokenKey.toString()
          );
          if (!tokenMetadata) {
            return;
          }
          const coinGeckoId = tokenMetadata?.coinGeckoId;
          const symbol = tokenMetadata?.ticker;
          const historicalPrices = await getCoinPriceFromId(coinGeckoId);
          const price = historicalPrices[historicalPrices.length - 1][1];
          const lastPrice = historicalPrices[historicalPrices.length - 2][1];

          dispatch({
            type: actionTypes.ADD_CURRENT_TOKEN,
            token: {
              ...token,
              balance,
              symbol,
              price,
              lastPrice,
              walletAddress: address.toString(),
              walletName: WALLETS.PHANTOM,
              network: 'Solana',
            },
          });
        }
      });
    } catch (err) {
      // error message
      console.log(err);
    }
  };

  const connectSolanaFromWallet = async () => {
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      localStorage.setItem('solanaAddress', addr);

      const pubKey = new solanaWeb3.PublicKey(addr);
      connectSolana(pubKey);
    } catch (err) {
      // error message
      console.log(err);
    }
  };

  const connectSolanaFromInput = async (e: any) => {
    e.preventDefault();
    try {
      const addr = e.target.address.value;
      //TODO: lol this isOnCurve function doesn't even work???
      if (solanaWeb3.PublicKey.isOnCurve(addr)) {
        const pubKey = new solanaWeb3.PublicKey(addr);
        localStorage.setItem('solanaAddress', addr);
        connectSolana(pubKey);
      } else {
        alert('Invalid Sol address');
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('solanaAddress') !== null) {
      const addr: string = String(localStorage.getItem('solanaAddress'));
      const pubKey = new solanaWeb3.PublicKey(addr);

      connectSolana(pubKey);
    }
  }, []);

  return (
    <div>
      {!solanaWallet && (
        <div>
          <button onClick={connectSolanaFromWallet}>Connect Solana</button>
          <form onSubmit={connectSolanaFromInput}>
            <input type="text" name="address" placeholder="or paste Sol address here" />
            <button type="submit">Submit</button>
          </form>
        </div>
      )}
      {solanaWallet && <div>✅ Solana connected </div>}
    </div>
  );
};

export default Solana;
