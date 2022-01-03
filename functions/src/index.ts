import * as functions from 'firebase-functions';
import * as express from 'express';
import cors = require('cors');
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';

import {
  geminiAuth,
  geminiRefresh,
  geminiAccounts,
  geminiHistory,
  updateGeminiAssets,
} from './handlers/gemini';
import {
  coinbaseProAccounts,
  coinbaseProLedger,
  updateCoinbaseProAssets,
} from './handlers/coinbasePro';
import { updateCoinbaseAssets } from './handlers/coinbase';
import { updateMetamaskAssets } from './handlers/metamask';
import { updateSolanaAssets } from './handlers/solana';

Sentry.init({
  dsn: 'https://9f55d53bfe644a7e82ce95ad8e4b1cef@o1098746.ingest.sentry.io/6123114',
  integrations: [new Integrations.Express()],
  environment: process.env.NODE_ENV,
  autoSessionTracking: true,
  tracesSampleRate: 1.0, // capture 100% of transactions
});

const app = express();
app.use(cors());

app.get('/', (_req, res) => res.status(200).send('Hey there!'));

app.get('/coinbaseProAccounts', coinbaseProAccounts);
app.get('/coinbaseProLedger', coinbaseProLedger);
app.get('/updateCoinbaseProAssets', updateCoinbaseProAssets);

app.get('/updateCoinbaseAssets', updateCoinbaseAssets);

app.get('/geminiAuth', geminiAuth);
app.get('/geminiRefresh', geminiRefresh);
app.get('/geminiAccounts', geminiAccounts);
app.get('/geminiHistory', geminiHistory);
app.get('/updateGeminiAssets', updateGeminiAssets);

app.get('/updateMetamaskAssets', updateMetamaskAssets);
app.get('/updateSolanaAssets', updateSolanaAssets);

exports.api = functions.https.onRequest(app);
