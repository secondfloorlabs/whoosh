export interface CoinbaseAccessResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface CoinbaseAccountResponse {
  data: [
    {
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
  ];
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

export interface CoinbasePrices {
  data: {
    amount: string;
    currency: string;
  };
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
