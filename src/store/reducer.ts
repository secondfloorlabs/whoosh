import * as actionTypes from './actionTypes';

const initialState: TokenState = {
  tokens: [],
  allTokens: [],
};

const reducer = (state: TokenState = initialState, action: TokenAction): TokenState => {
  switch (action.type) {
    case actionTypes.ADD_CURRENT_TOKEN:
      const newCurrentToken: IToken = action.token;
      return {
        ...state,
        tokens: state.tokens.concat(newCurrentToken),
      };
    case actionTypes.ADD_ALL_TOKEN:
      const newAllToken: IToken = action.token;
      return {
        ...state,
        allTokens: state.allTokens.concat(newAllToken),
      };
  }
  return state;
};

export default reducer;
