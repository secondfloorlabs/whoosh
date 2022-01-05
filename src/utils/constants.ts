export const LINKS = {
  baseURL: 'https://app.whoosh.finance',
  localURL: 'http://localhost:3000',
};

export enum WALLETS {
  COINBASE = 'Coinbase',
  COINBASE_PRO = 'Coinbase Pro',
  METAMASK = 'Metamask',
  PHANTOM = 'Phantom',
  GEMINI = 'Gemini',
}

export enum NETWORKS {
  SOLANA = 'solana',
  ETHEREUM = 'eth',
  BINANCE_SMART_CHAIN = 'bsc',
  POLYGON = 'polygon',
  AVALANCHE = 'avalanche',
  FANTOM = 'ftm',
}

export enum LOCAL_STORAGE_KEYS {
  SOLANA_ADDRESSES = 'solanaAddresses',
  METAMASK_ADDRESSES = 'metamaskAddresses',
  COINBASE_ACCESS_TOKEN = 'coinbaseAccessToken',
  COINBASE_REFRESH_TOKEN = 'coinbaseRefreshToken',
  COINBASE_PRO_API_KEY = 'coinbaseProApiKey',
  COINBASE_PRO_PASSPHRASE = 'coinbaseProPassphrase',
  COINBASE_PRO_SECRET = 'coinbaseProSecret',
}

export const SOL_PER_LAMPORT = 0.000000001;

// hardcoded scam coins with price quote in Covalent
export const ScamCoins = ['AeFX.io', 'FlowDAO.io'];
