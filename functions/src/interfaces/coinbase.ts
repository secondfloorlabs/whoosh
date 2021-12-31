export interface CoinbaseWallet {
  id: string;
  name: string;
  primary: string;
  type: string;
  currency: {
    code: string;
    name: string;
  };
  balance: {
    amount: string;
    currency: string;
  };
}

export interface CoinbaseAccessResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface CoinbaseProAccounts {
  available: string;
  balance: string;
  currency: string;
  hold: string;
  id: string;
  profile_id: string;
  trading_enabled: boolean;
}

export interface CoinbaseProLedger {
  created_at: string;
  id: string;
  amount: string;
  balance: string;
  type: string;
  details: {
    to: string;
    from: string;
    profile_transfer_id: string;
  };
}
