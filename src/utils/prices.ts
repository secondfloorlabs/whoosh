import axios from 'axios';

export const getCoinPrices = async (symbols: string[]) => {
  const ids = symbols.join(',');
  const response = await axios.get(
    `https://api.nomics.com/v1/currencies/ticker?key=345be943016fa1e2f6550e237d6fbf125ed7566f&ids=${ids}&convert=USD&per-page=100&page=1`
  );

  if (!response || response.data.length <= 0) {
    throw new Error('No coingecko price found for coins: ' + ids);
  }

  return response.data;
};
