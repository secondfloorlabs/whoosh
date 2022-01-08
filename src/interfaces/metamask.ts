export interface Chain {
  network: string;
  symbol: string;
  name: string;
  decimals: string;
  covalentId: string;
}

export interface TokenContract {
  contract_address: string;
  contract_decimals: number;
  contract_name: string;
  contract_ticker_symbol: string;
  holdings: TokenHolding[];
}

export interface TokenHolding {
  close: {
    balance: number;
    quote: number;
  };
  quote_rate: number;
  timestamp: string; // in ISO date (2021-12-24T00:00:00Z)
}
