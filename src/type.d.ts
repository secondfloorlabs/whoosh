interface IToken {
  walletName: string;
  balance: number;
  symbol: string;
  name: string;
  network?: string;
  walletAddress?: string;
  address?: string;
  /* Fiat value of the person's holding over time */
  historicalWorth?: { worth: number; timestamp: number }[];
  /* Coin balance of the person's holding over time */
  historicalBalance?: { balance: number; timestamp: number }[];
  /* Price of the coin over time */
  historicalPrice?: { price: number; timestamp: number }[];
  price?: number;
  lastPrice?: number;
  apy?: number;
  totalBalanceBought?: number;
  totalFiatBought?: number;
  totalBalanceSold?: number;
  totalFiatSold?: number;
}

type TokenState = {
  tokens: IToken[];
  allTokens: IToken[];
};

type TokenAction = {
  type: string;
  token: IToken;
};

type DispatchType = (args: TokenAction) => TokenAction;

/**
 * The way this should work ideally is that each wallet is a balance of a certain amount tied to an address
 * So the wallet would be a string: "MM or metamask"
 * address: wallet address
 * currency - for housekeeping, etc
 *
 * When we get a new api call, we store the action which would be something like setWallet or addWallet for first time
 * this would then store the balance after retrieving
 *
 *https://www.freecodecamp.org/news/how-to-use-redux-in-your-react-typescript-app/#prerequisites
 */
