import { useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

// import { WALLETS } from 'src/utils/constants';
// import { getCoinPriceFromName } from 'src/utils/prices';
// import * as actionTypes from 'src/store/actionTypes';
import { authCodeAccess, createGeminiUrl, storeTokensLocally } from 'src/services/gemini';
import { captureMessage } from '@sentry/react';
import { Button } from 'react-bootstrap';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData } from 'src/services/firebase';

// https://docs.gemini.com/oauth/#using-access-tokens

const Gemini = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  const user = useContext(AuthContext);

  useEffect(() => {
    const geminiAccessToken = localStorage.getItem('geminiAccessToken');
    const geminiRefreshToken = localStorage.getItem('geminiRefreshToken');

    if (geminiAccessToken && geminiRefreshToken) {
      const access = { geminiAccessToken, geminiRefreshToken };
      if (user) addUserAccessData(user, access);
    }
  }, [user]);

  useEffect(() => {
    const geminiInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) return;

      try {
        const geminiAccess = await authCodeAccess(code);
        // const accessToken = geminiAccess.access_token;
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

    if (localStorage.getItem('geminiAccessToken') === null) {
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
          <Button variant="primary" size="sm">
            <a href={createGeminiUrl()} style={{ textDecoration: 'none', color: 'white' }}>
              Connect Gemini
            </a>
          </Button>
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
