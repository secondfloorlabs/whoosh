// import axios, { AxiosResponse } from 'axios';

export interface CoinGeckoResponse {
  data: [];
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

//// NOTE: adding for later helper code -- having trouble with TS and pulling this into other files
// export const receiveCoinGeckoData = async (tokenSlug:string) => {

//   console.log(tokenSlug);

//   const response: AxiosResponse<CoinGeckoResponse> = await axios.get(
//     `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${tokenSlug}`
//   );

//   if (response) {
//     return response;
//   }
// };

export function getWalletBalanceUSD(walletAmount: number, walletPrice: number): string {
  return (walletAmount * walletPrice).toFixed(2);
}
