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
      // resource_path: '/v2/accounts/2bbf394c-193b-5b2a-9155-3b4732659ede/transactions/4117f7d6-5694-5b36-bc8f-847509850ea4';
      // buy: {
      //   id: '9e14d574-30fa-5d85-b02c-6be0d851d61d';
      //   resource: 'buy';
      //   resource_path: '/v2/accounts/2bbf394c-193b-5b2a-9155-3b4732659ede/buys/9e14d574-30fa-5d85-b02c-6be0d851d61d';
      // };
      details: {
        title: string;
        subtitle: string;
      };
    }
  ];
}
