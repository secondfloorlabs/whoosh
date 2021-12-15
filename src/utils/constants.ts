export const LINKS = {
  baseURL: 'https://app.whoosh.finance',
  localURL: 'http://localhost:3000',
};

export const COINBASE_AUTH = {
  client_id: '8ad3a3e1c85af0f56ee3f305b4930a67d8b126df89504c53ae871731ed186a2a',
  client_secret: 'ce0e6c99fc27c887ae42b9fa212bf12678cd329ba1330a32849ef738b8c40af8',
  response_type: 'code',
  scope: 'wallet:user:read wallet:accounts:read wallet:transactions:read',
  authorizeUrl: 'https://www.coinbase.com/oauth/authorize',
  oauthTokenUrl: 'https://api.coinbase.com/oauth/token',
  accountsUrl: 'https://api.coinbase.com/v2/accounts?limit=100',
  grant_type: 'authorization_code',
  account: 'all',
};

export enum WALLETS {
  COINBASE = 'Coinbase',
  METAMASK = 'Metamask',
  PHANTOM = 'Phantom',
}
