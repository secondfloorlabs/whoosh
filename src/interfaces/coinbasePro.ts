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
