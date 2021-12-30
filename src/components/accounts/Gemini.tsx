import { useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import * as actionTypes from 'src/store/actionTypes';
import {
  accessAccount,
  authCodeAccess,
  createGeminiUrl,
  refreshTokenAccess,
  storeTokensLocally,
} from 'src/services/gemini';
import { captureMessage } from '@sentry/react';
import { Button } from 'react-bootstrap';
import { AuthContext } from 'src/context/AuthContext';
import { addUserAccessData } from 'src/services/firebase';
import { Balance, Earn, WalletType } from 'src/interfaces/gemini';
import { WALLETS } from 'src/utils/constants';
import { getCoinPriceFromName } from 'src/utils/prices';

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
    const getWalletData = async (wallets: Balance[] | Earn[]) => {
      await Promise.all(
        wallets.map(async (w) => {
          let token: IToken;

          const symbol = w.currency;

          try {
            // const rawHistoricalPrices = await getCoinPriceFromName(symbol, symbol);

            // const currentPrice = rawHistoricalPrices[rawHistoricalPrices.length - 1][1];
            // const lastPrice = rawHistoricalPrices[rawHistoricalPrices.length - 2][1];
            // console.log(w);
            // console.log(rawHistoricalPrices);

            if (w.type === WalletType.BALANCE) {
              const wallet = w as Balance;

              token = {
                walletName: WALLETS.GEMINI,
                name: wallet.currency,
                balance: +wallet.amount,
                symbol,
                // price: currentPrice,
                // lastPrice,
              };
            } else {
              const wallet = w as Earn;
              token = {
                walletName: WALLETS.GEMINI,
                name: wallet.currency,
                balance: wallet.balance,
                symbol,
                // price: currentPrice,
                // lastPrice,
              };
            }

            dispatch({ type: actionTypes.ADD_ALL_TOKEN, token });
            dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token });
          } catch (err) {
            // getting transactions or pricename failed
            captureMessage(`${e}`);
          }
        })
      );
    };

    const geminiInitialAuth = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) return;

      try {
        const geminiAccess = await authCodeAccess(code);

        const accessToken = geminiAccess.access_token;
        storeTokensLocally(geminiAccess);

        const geminiAccount = await accessAccount(accessToken);
        getWalletData(geminiAccount);

        setAuthorized(true);
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
          const accessToken = tokenAccess.access_token;
          storeTokensLocally(tokenAccess);

          const geminiAccount = await accessAccount(accessToken);
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
