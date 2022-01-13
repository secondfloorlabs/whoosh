export function isSameToken(token1: IToken, token2: IToken): boolean {
  return (
    token1.name.toLowerCase() === token2.name.toLowerCase() &&
    token1.symbol.toLowerCase() === token2.symbol.toLowerCase() &&
    token1.network?.toLowerCase() === token2.network?.toLowerCase()
  );
}
