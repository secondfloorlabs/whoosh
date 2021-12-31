import * as functions from 'firebase-functions';
import * as express from 'express';
import cors = require('cors');
import { geminiAuth, geminiRefresh, geminiAccounts, geminiHistory } from './handlers/gemini';
import {
  coinbaseProAccounts,
  coinbaseProLedger,
  updateCoinbaseProAccount,
} from './handlers/coinbasePro';

const app = express();
app.use(cors());

app.get('/', (_req, res) => res.status(200).send('Hey there!'));

app.get('/coinbaseProAccounts', coinbaseProAccounts);
app.get('/coinbaseProLedger', coinbaseProLedger);
app.get('/updateCoinbaseProAccount', updateCoinbaseProAccount);

app.get('/geminiAuth', geminiAuth);
app.get('/geminiRefresh', geminiRefresh);
app.get('/geminiAccounts', geminiAccounts);
app.get('/geminiHistory', geminiHistory);

exports.api = functions.https.onRequest(app);
