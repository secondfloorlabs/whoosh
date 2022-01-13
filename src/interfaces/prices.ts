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

export enum CovalentTransferType {
  IN = 'IN',
  OUT = 'OUT',
}

export interface CovalentTokenTransaction {
  items: {
    successful: boolean;
    // WEI spent on gas
    gas_spent: number;
    // Price of gas in USD
    gas_quote_rate: number;
    transfers: {
      // ISO Timestamp when block was mined
      block_signed_at: string;
      transfer_type: CovalentTransferType;
      // Amount changed  in WEI
      delta: string;
      contract_decimals: number;
      // Unit price in USD at the time of transaction
      quote_rate: number;
      // Total transaction price in USD
      delta_quote: number;
    }[];
  }[];
}

export interface CovalentTransaction {
  items: {
    from_address: string;
    to_address: string | null;
    tx_hash: string;
    successful: boolean;
    // WEI spent on gas
    gas_spent: number;
    // Price of gas in USD
    gas_quote_rate: number;
    value: number;
    value_quote: number;
  }[];
}
