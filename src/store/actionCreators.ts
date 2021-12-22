import * as actionTypes from './actionTypes';

export function addCurrentToken(token: IToken) {
  const action: TokenAction = {
    type: actionTypes.ADD_CURRENT_TOKEN,
    token: token,
  };

  return action;
}

export function addAllToken(token: IToken) {
  const action: TokenAction = {
    type: actionTypes.ADD_ALL_TOKEN,
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
