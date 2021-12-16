import axios from 'axios';

export const getCoinPrices = async (symbols: string[]) => {
  const ids = symbols.join(',');

  const response = await axios.get(
    `https://us-central1-whooshwallet.cloudfunctions.net/api/prices?ids=${ids}`
  );

  if (!response || response.data.length <= 0) {
    throw new Error('No coingecko price found for coins: ' + ids);
  }

  return response.data;
};
