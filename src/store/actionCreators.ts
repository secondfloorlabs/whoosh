import * as actionTypes from "./actionTypes"

export function addWallet(wallet: IWallet) {
    const action: WalletAction = {
        type: actionTypes.ADD_WALLET,
        wallet,
    }

    return action;
}

export function simulateHttpRequest(action: WalletAction) {
    return (dispatch: DispatchType) => {
        setTimeout(() => {
            dispatch(action)
        }, 500)
    }
}