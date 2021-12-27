import axios from 'axios';
import { CoinbaseProAccounts } from 'src/services/coinbaseProTypes';
import { WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';

export async function getAccountsData(
  apikey: string,
  passphrase: string,
  secret: string
): Promise<CoinbaseProAccounts[]> {
  const query = `https://us-central1-whooshwallet.cloudfunctions.net/api/coinbaseProAccounts?cb_access_key=${apikey}&cb_access_passphrase=${passphrase}&secret=${encodeURIComponent(
    secret
  )}`;

  const response = await axios.get(query);

  return response.data;
}

export async function convertAccountData(
  wallets: CoinbaseProAccounts[]
): Promise<IToken[] | undefined> {
  const completeTokens: IToken[] = await Promise.all(
    wallets
      .filter((wallet) => +parseFloat(wallet.balance) > 0)
      .map(async (wallet) => {
        const balance = +parseFloat(wallet.balance);
        const symbol = wallet.currency;

        // TODO: use an api to get name from symbol
        const rawHistoricalPrices = await getCoinPriceFromName(symbol, symbol);

        const currentPrice = rawHistoricalPrices[rawHistoricalPrices.length - 1][1];
        const lastPrice = rawHistoricalPrices[rawHistoricalPrices.length - 2][1];

        const completeToken = {
          walletName: WALLETS.COINBASE_PRO,
          balance,
          symbol,
          name: symbol,
          price: currentPrice,
          lastPrice,
        };

        return completeToken;
      })
  );

  return completeTokens;
}
