export function isSameToken(token1: IToken, token2: IToken): boolean {
  return token1.symbol.toLowerCase() === token2.symbol.toLowerCase();
}
