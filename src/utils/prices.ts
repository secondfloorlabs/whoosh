import axios from 'axios';
import { coinGeckoList, coinGeckoKeys } from 'src/utils/coinGeckoList';
import Fuse from 'fuse.js';

const options = { includeScore: true, keys: ['name'], threshold: 1.0 };

export const getCoinPriceFromName = async (name: string, ticker: string): Promise<number[][]> => {
  const lowercaseTicker = ticker.toLowerCase();
  const lowercaseName = name.toLowerCase();
  const key = `${lowercaseName}_${lowercaseTicker}`;
  let coinGeckoId = coinGeckoList[key];
  if (coinGeckoId === undefined) {
    const matchingTickers = coinGeckoKeys.filter((token) => token.ticker === lowercaseTicker);
    if (matchingTickers.length === 0) {
      throw new Error(`No matching tickers for name: ${name} ticker: ${ticker}`);
    }
    console.log(matchingTickers);
    const fuse = new Fuse(matchingTickers, options);
    const searchResult = fuse.search(lowercaseName);
    console.log(searchResult);
    if (searchResult.length === 0) {
      // If we only have 1 matching ticker and no search results
      if (matchingTickers.length === 1) {
        coinGeckoId = matchingTickers[0].id;
      } else {
        throw new Error(`No matching coingecko id for name: ${name} ticker: ${ticker}`);
      }
    } else {
      coinGeckoId = searchResult[0].item.id;
    }
  }
  return await getCoinPriceFromId(coinGeckoId);
};

export const getCoinPriceFromId = async (coinGeckoId: string): Promise<number[][]> => {
  const response = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/ohlc?vs_currency=usd&days=max`
  );

  if (!response || response.data.length <= 0) {
    throw new Error(`No coingecko price found for coin id: ${coinGeckoId}`);
  }

  return response.data;
};

export const getCoinPriceFromNameAndHistory = async (name: string, ticker: string, date: string): Promise<number[][]> => {
  const lowercaseTicker = ticker.toLowerCase();
  const lowercaseName = name.toLowerCase();
  const key = `${lowercaseName}_${lowercaseTicker}`;
  let coinGeckoId = coinGeckoList[key];
  if (coinGeckoId === undefined) {
    const matchingTickers = coinGeckoKeys.filter((token) => token.ticker === lowercaseTicker);
    if (matchingTickers.length === 0) {
      throw new Error(`No matching tickers for name: ${name} ticker: ${ticker}`);
    }
    // console.log(matchingTickers);
    const fuse = new Fuse(matchingTickers, options);
    const searchResult = fuse.search(lowercaseName);
    // console.log(searchResult);
    if (searchResult.length === 0) {
      // If we only have 1 matching ticker and no search results
      if (matchingTickers.length === 1) {
        coinGeckoId = matchingTickers[0].id;
      } else {
        throw new Error(`No matching coingecko id for name: ${name} ticker: ${ticker}`);
      }
    } else {
      coinGeckoId = searchResult[0].item.id;
    }
  }
  return await getCoinPriceFromIdAndHistory(coinGeckoId,date);
};

export const getCoinPriceFromIdAndHistory = async (coinGeckoId: string,date:string): Promise<number[][]> => {
  const day = date.slice(8,10);
  const month = date.slice(5,7);
  const year = date.slice(0,4);

  const response = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/history?date=${day}-${month}-${year}&localization=false`
  );

  if (!response || response.data.length <= 0) {
    throw new Error(`No coingecko price found for coin id: ${coinGeckoId}`);
  }

  return response.data;
};

export const getERC20EtherScan = async (address: string) => {

  const response = await axios.get(`https://api.etherscan.io/api?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=2702578&page=1&offset=10&sort=asc&apikey=AHDW6XN6KWI3XUKXWE8PWZBKY8AZQ3Q5NA`);

  if (!response || response.data.length <= 0) {
    throw new Error(`No erc20 found for coin id: ${address}`);
  }

  return response.data;
};