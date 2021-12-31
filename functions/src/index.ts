import * as functions from 'firebase-functions';
import * as express from 'express';
import cors = require('cors');
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

exports.api = functions.https.onRequest(app);
