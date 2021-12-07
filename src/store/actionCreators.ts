import * as actionTypes from "./actionTypes"

export function addArticle(wallet: IWallet) {
    const action: WalletAction = {
        type: actionTypes.ADD_WALLET,
        wallet,
    }

    return simulateHttpRequest(action)
}

export function simulateHttpRequest(action: WalletAction) {
    return (dispatch: DispatchType) => {
        setTimeout(() => {
            dispatch(action)
        }, 500)
    }
}