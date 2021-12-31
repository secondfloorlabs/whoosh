export interface SplToken {
  publicKey: string;
  symbol: string;
  name: string;
  coinGeckoId: string;
}

export interface StakedAccountResponse {
  success: boolean;
  data: {
    address: {
      voter: string;
      amount: string;
      type: string;
      stakeAccount: string;
      staker: string;
      role: string[];
    };
  };
}

export interface StakedAccount {
  balance: number;
  address: string;
}

export interface TokenMetadata {
  [tokenAddress: string]: {
    symbol: string;
    name: string;
    coinGeckoId: string;
  };
}

export interface TokenBalance {
  balance: number;
  timestamp: number;
  tokenAddress: string;
}

export interface SolanaTransaction {
  txHash: string;
  accounts: string[];
  meta: {
    postBalances: number[];
    postTokenBalances: {
      accountIndex: number;
      mint: string;
      uiTokenAmount: { uiAmountString: string };
    }[];
  };
}
