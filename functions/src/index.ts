import * as functions from 'firebase-functions';
import * as express from 'express';
import cors = require('cors');
import axios from 'axios';

const app = express();
app.use(cors());

app.get('/', (req, res) => res.status(200).send('Hey there!'));

app.get('/prices', async (req, res) => {
  const { ids } = req.query;
  const nomicsKey = '345be943016fa1e2f6550e237d6fbf125ed7566f';

  const response = await axios.get(
    `https://api.nomics.com/v1/currencies/ticker?key=${nomicsKey}&ids=${ids}&convert=USD&per-page=100&page=1`
  );

  if (!response || response.data.length <= 0) {
    return res.status(400).json({ error: `No coingecko price found for coins: ${ids}` });
  }

  return res.status(200).json(response.data);
});

exports.api = functions.https.onRequest(app);
