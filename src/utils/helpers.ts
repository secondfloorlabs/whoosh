// import axios, { AxiosResponse } from 'axios';

export interface CoinGeckoResponse {
  data: [];
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

//// NOTE: adding for later helper code -- having trouble with TS and pulling this into other files
// export const receiveCoinGeckoData = async (tokenSlug:string) => {

//   const response: AxiosResponse<CoinGeckoResponse> = await axios.get(
//     `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${tokenSlug}`
//   );

//   if (response) {
//     return response;
//   }
// };

/**
 * Takes in wallet amount and current price and multiples to get total balance
 * @param walletAmount
 * @param walletPrice
 * @returns string of the total balance
 */
export function getWalletBalanceUSD(walletAmount: number, walletPrice: number): string {
  return (walletAmount * walletPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

/**
 * Displays a number in USD currency
 * @param num
 * @returns string of usd
 */
export function displayInUSD(num: number): string {
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

/**
 * Displays a number between 0-1 and returns percent (.5 -> 50%)
 * @param num
 * @returns string of percent
 */
export function displayInPercent(num: number): string {
  return num.toLocaleString('en-US', { style: 'percent', minimumFractionDigits: 2 });
}

export function merge(pair1: { [key: string]: any }, pair2: { [key: string]: any }) {
  const mergedPair: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(pair1)) {
    mergedPair[key] = value;
  }
  for (const [key, value] of Object.entries(pair2)) {
    mergedPair[key] = value;
  }
  return mergedPair;
}

export function capitalizeFirstLetter(str: string | undefined) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}

/**
 * This function is triggered if an error occurs while loading an image
 * @param event
 */
export const imageOnErrorHandler = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  event.currentTarget.src = 'https://images.emojiterra.com/twitter/v13.1/512px/1fa99.png';
  event.currentTarget.onerror = null;
};
