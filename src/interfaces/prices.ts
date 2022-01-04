export interface PriceTimestamp {
  price: number;
  timestamp: number;
}

export interface TransactionsCoinGecko {
  timestamp: number;
  accountTransactions: any;
  balance: number;
}

export interface BalanceTimestamp {
  balance: number;
  timestamp: number;
}

export interface WorthTimestamp {
  worth: number;
  timestamp: number;
}
