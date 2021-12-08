import * as actionTypes from './actionTypes';

const initialState: WalletState = {
  wallets: [],
};

const reducer = (state: WalletState = initialState, action: WalletAction): WalletState => {
  switch (action.type) {
    case actionTypes.ADD_WALLET:
      const newWallet: IWallet = action.wallet;
      console.log('add wallet called');
      console.log(state.wallets.concat(newWallet));
      return {
        ...state,
        wallets: state.wallets.concat(newWallet),
      };
  }
  return state;
};

export default reducer;
