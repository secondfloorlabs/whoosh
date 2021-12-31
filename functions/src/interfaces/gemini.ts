export interface GeminiAccessResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
}

export enum WalletType {
  BALANCE = 'Balance',
  EARN = 'Earn',
}

export interface Balance {
  type: WalletType;
  currency: string;
  amount: string;
  amountNotional: string;
  available: string;
  availableNotional: string;
  availableForWithdrawal: string;
  availableForWithdrawalNotional: string;
}

export interface Earn {
  type: WalletType;
  currency: string;
  balance: number;
  available: number;
  availableForWithdrawal: number;
  balanceByProvider: {
    key: {
      balance: number;
    };
  };
}
