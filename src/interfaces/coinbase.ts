export interface CoinbaseAccessResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

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

export interface CoinbaseTransactions {
  pagination: {
    ending_before: string | null;
    starting_after: string | null;
    limit: number;
    order: string;
    previous_uri: string | null;
    next_uri: string | null;
  };
  data: [
    {
      id: string;
      type: string;
      status: string;
      amount: {
        amount: string;
        currency: string;
      };
      native_amount: {
        amount: string;
        currency: string;
      };
      description: string | null;
      created_at: string;
      updated_at: string;
      resource: string;
      details: {
        title: string;
        subtitle: string;
      };
    }
  ];
}

export interface CoinbaseTransactionsComplete {
  id: string;
  type: string;
  status: string;
  amount: {
    amount: string;
    currency: string;
  };
  native_amount: {
    amount: string;
    currency: string;
  };
  description: string | null;
  created_at: string;
  updated_at: string;
  resource: string;
  details: {
    title: string;
    subtitle: string;
  };
}

export interface CoinbaseToCoinGecko {
  timestamp: number;
  coinbaseTransactions: any;
  balance: number;
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
