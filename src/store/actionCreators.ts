import * as actionTypes from './actionTypes';

export function addToken(token: IToken) {
  const action: TokenAction = {
    type: actionTypes.ADD_TOKEN,
    token: token,
  };

  return action;
}

export function simulateHttpRequest(action: TokenAction) {
  return (dispatch: DispatchType) => {
    setTimeout(() => {
      dispatch(action);
    }, 500);
  };
}
