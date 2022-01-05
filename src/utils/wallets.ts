export function isWalletInRedux(tokens: IToken[], address: string): boolean {
  return tokens.find((token) => token.walletAddress === address) !== undefined;
}
