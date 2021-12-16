import axios from 'axios';
import { coinGeckoList } from '../utils/coinGeckoList';

export const getCoinPriceFromName = async (name: string, ticker: string): Promise<number[][]> => {
  const key = `${name}_${ticker}`.toLowerCase();
  console.log(key);
  const coinGeckoId = coinGeckoList[key];
  if (coinGeckoId === undefined) {
    throw new Error(`No matching key for coin name: ${name}, ticker: ${ticker}`);
  }
  return await getCoinPriceFromId(coinGeckoId);
};

export const getCoinPriceFromId = async (coinGeckoId: string): Promise<number[][]> => {
  console.log(coinGeckoId);
  const response = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/ohlc?vs_currency=usd&days=max`
  );
  console.log(response);

  if (!response || response.data.length <= 0) {
    throw new Error(`No coingecko price found for coin id: ${coinGeckoId}`);
  }

  return response.data;
};
