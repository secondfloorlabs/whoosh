import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';
import * as actionTypes from 'src/store/actionTypes';
import { authCodeAccess, createGeminiUrl, storeTokensLocally } from 'src/services/gemini';
import { captureMessage } from '@sentry/react';

// https://docs.gemini.com/oauth/#using-access-tokens

const Gemini = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);

  useEffect(() => {
    const geminiInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) return;

      try {
        const geminiAccess = await authCodeAccess(code);
        const accessToken = geminiAccess.access_token;
        storeTokensLocally(geminiAccess);

        // const geminiAccount = await accessAccount(accessToken);
        // const wallets = geminiAccount.reverse(); // primary wallet (BTC) top of list
        // getWalletData(wallets);
        setAuthorized(true);
      } catch (err) {
        captureMessage(`Invalid gemini param code\n${err}`);
      }
    };

    const geminiReauth = async () => {};

    if (localStorage.getItem('coinbaseAccessToken') === null) {
      // first time auth
      geminiInitialAuth();
    } else {
      // reauthing
      geminiReauth();
    }
  }, [dispatch]);

  return (
    <div className="App">
      <div>
        {!authorized && (
          <button>
            <a href={createGeminiUrl()}>Connect Gemini</a>
          </button>
        )}
      </div>

      {authorized && (
        <div style={{ height: '100%' }}>
          <p>✅ Gemini connected</p>
        </div>
      )}
    </div>
  );
};

export default Gemini;
