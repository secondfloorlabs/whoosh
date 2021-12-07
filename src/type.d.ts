interface IWallet {
  address: string;
  wallet: string;
  currency: string;
  balance: number;
}

type WalletState = {
  wallets: IWallet[];
};

type WalletAction = {
  type: string;
  wallet: IWallet;
};

type DispatchType = (args: WalletAction) => WalletAction;

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
