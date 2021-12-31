import admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

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
  };
  displayName: string;
  email: string;
  userUid: string;
};

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
}

export { admin, db };
