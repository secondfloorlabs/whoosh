import { useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import * as actionTypes from 'src/store/actionTypes';
import {
  accessAccount,
  authCodeAccess,
  convertAccountData,
  createGeminiUrl,
  refreshTokenAccess,
  storeTokensLocally,
} from 'src/services/gemini';
import { captureMessage } from '@sentry/react';
import { Button } from 'react-bootstrap';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData } from 'src/services/firebase';
import { Balance, Earn } from 'src/interfaces/gemini';
import { Mixpanel } from 'src/utils/mixpanel';

const Gemini = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  const user = useContext(AuthContext);

  useEffect(() => {
    const getWalletData = async (wallets: Balance[] | Earn[]) => {
      const completeToken = await convertAccountData(wallets);

      dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });
    };

    const geminiInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) return;

      try {
        const geminiAccess = await authCodeAccess(code);

        const geminiAccessToken = geminiAccess.access_token;
        const geminiRefreshToken = geminiAccess.refresh_token;
        storeTokensLocally(geminiAccess);

        const access = { geminiAccessToken, geminiRefreshToken };
        if (user) addUserAccessData(user, access);

        const geminiAccount = await accessAccount(geminiAccessToken);
        getWalletData(geminiAccount);

        setAuthorized(true);
        Mixpanel.track('Gemini Wallet Connected');
        //Mixpanel.people.set({geminiTokens: access});
      } catch (err) {
        captureMessage(`Invalid gemini param code\n${err}`);
      }
    };

    const geminiReauth = async () => {
      try {
        const accountLocal = await accessAccount(localStorage.getItem('geminiAccessToken'));
        getWalletData(accountLocal);
        setAuthorized(true);
      } catch (err) {
        // access token failed
        try {
          const tokenAccess = await refreshTokenAccess(localStorage.getItem('geminiRefreshToken'));

          // refresh local storage
          const geminiAccessToken = tokenAccess.access_token;
          const geminiRefreshToken = tokenAccess.refresh_token;
          storeTokensLocally(tokenAccess);

          const access = { geminiAccessToken, geminiRefreshToken };
          if (user) addUserAccessData(user, access);

          const geminiAccount = await accessAccount(geminiAccessToken);
          getWalletData(geminiAccount);

          setAuthorized(true);
        } catch (err) {
          // refresh and access token failed
          geminiInitialAuth();
        }
      }
    };

    if (localStorage.getItem('geminiAccessToken') === null) {
      // first time auth
      geminiInitialAuth();
    } else {
      // reauthing
      geminiReauth();
    }
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="App">
      <div>
        {!authorized && (
          <Button
            variant="outline-dark"
            style={{ borderColor: '#272A3E', width: '100%', textAlign: 'left' }}
          >
            &nbsp;
            <img
              src={`https://cryptologos.cc/logos/gemini-dollar-gusd-logo.png`}
              height="28px"
              width="28px"
              alt=""
            />{' '}
            <a href={createGeminiUrl()} style={{ textDecoration: 'none', color: 'white' }}>
              Connect Gemini
            </a>
          </Button>
        )}
      </div>

      {authorized && (
        <Button
          variant="outline-dark"
          style={{ borderColor: '#272A3E', width: '100%', textAlign: 'left' }}
        >
          &nbsp;
          <img
            src={`https://cryptologos.cc/logos/gemini-dollar-gusd-logo.png`}
            height="28px"
            width="28px"
            alt=""
          />{' '}
          <span style={{ textDecoration: 'none', color: 'white' }}>Gemini Connected</span>
        </Button>
      )}
    </div>
  );
};

export default Gemini;
