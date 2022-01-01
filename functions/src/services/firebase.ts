import admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// User schema for firestore
export type User = {
  access: {
    coinbaseAccessToken: string;
    coinbaseProApiKey: string;
    coinbaseProPassphrase: string;
    coinbaseProSecret: string;
    coinbaseRefreshToken: string;
    geminiAccessToken: string;
    geminiRefreshToken: string;
    metamaskAddress: string;
    solanaAddress: string;
  };
  displayName: string;
  email: string;
  userUid: string;
};

// Wallet schema for firestore
// other fields might exist - use specific wallet interface for retrieval
export type Wallet = {
  key: {
    walletName: {
      walletId: {
        balance: number;
        symbol: string;
        name: string;
      };
    };
  };
};

export enum Collections {
  USER = 'user',
  WALLET = 'wallet',
  COINBASE_PRO = 'coinbasepro',
  COINBASE = 'coinbase',
  GEMINI = 'gemini',
  METAMASK = 'metamask',
  SOLANA = 'solana',
}

export { admin, db };
