import * as actionTypes from './actionTypes';

const initialState: TokenState = {
  tokens: [],
};

const reducer = (state: TokenState = initialState, action: TokenAction): TokenState => {
  switch (action.type) {
    case actionTypes.ADD_TOKEN:
      const newToken: IToken = action.token;
      return {
        ...state,
        tokens: state.tokens.concat(newToken),
      };
  }
  return state;
};

export default reducer;
