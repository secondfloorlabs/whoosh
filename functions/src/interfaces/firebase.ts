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
