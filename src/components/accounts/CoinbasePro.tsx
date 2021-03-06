import { useContext, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button, Form, FormControl, Modal } from 'react-bootstrap';

import * as actionTypes from 'src/store/actionTypes';
import { convertAccountData, getAccountsData } from 'src/services/coinbasePro';
import { addUserAccessData, getUserMetadata } from 'src/services/firebase';
import { AuthContext } from 'src/context/AuthContext';
import { LOCAL_STORAGE_KEYS } from 'src/utils/constants';
import { User } from 'firebase/auth';
import { Mixpanel } from 'src/utils/mixpanel';

const CoinbasePro = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  const [show, setShow] = useState(false);
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const passphraseRef = useRef<HTMLInputElement>(null);
  const secretRef = useRef<HTMLInputElement>(null);

  const user = useContext(AuthContext);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const apiKey = apiKeyRef?.current?.value;
    const passphrase = passphraseRef?.current?.value;
    const secret = secretRef?.current?.value;
    if (apiKey && passphrase && secret) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_API_KEY, apiKey);
      localStorage.setItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_PASSPHRASE, passphrase);
      localStorage.setItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_SECRET, secret);

      const access = {
        coinbaseProApiKey: apiKey,
        coinbaseProPassphrase: passphrase,
        coinbaseProSecret: secret,
      };
      if (user) addUserAccessData(user, access);

      const wallets = await getAccountsData(apiKey, passphrase, secret);
      const completeToken = await convertAccountData(wallets, apiKey, passphrase, secret);

      dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });

      setAuthorized(true);
      Mixpanel.track('Coinbase Pro Wallet Connected');
    } else {
      alert('Missing Key/Passphrase/Secret');
    }
  };

  useEffect(() => {
    const getAccountLocalStorage = async () => {
      if (localStorage.getItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_API_KEY) !== null) {
        const apiKey = String(localStorage.getItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_API_KEY));
        const passphrase = String(localStorage.getItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_PASSPHRASE));
        const secret = String(localStorage.getItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_SECRET));

        const access = {
          coinbaseProApiKey: apiKey,
          coinbaseProPassphrase: passphrase,
          coinbaseProSecret: secret,
        };
        if (user) addUserAccessData(user, access);

        const wallets = await getAccountsData(apiKey, passphrase, secret);

        const completeToken = await convertAccountData(wallets, apiKey, passphrase, secret);

        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });

        setAuthorized(true);
      }
    };

    const getAccountFirebase = async (user: User) => {
      // firebase logged in
      const userMetadata = await getUserMetadata(user);

      // store user tokens in localstorage for multiple device sync
      if (userMetadata && userMetadata.access.coinbaseProApiKey) {
        const apiKey = userMetadata.access.coinbaseProApiKey;
        const passphrase = userMetadata.access.coinbaseProPassphrase;
        const secret = userMetadata.access.coinbaseProSecret;

        localStorage.setItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_API_KEY, apiKey);
        localStorage.setItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_PASSPHRASE, passphrase);
        localStorage.setItem(LOCAL_STORAGE_KEYS.COINBASE_PRO_SECRET, secret);

        const wallets = await getAccountsData(apiKey, passphrase, secret);

        const completeToken = await convertAccountData(wallets, apiKey, passphrase, secret);

        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });
        setAuthorized(true);
      }
    };

    if (user === undefined) {
      // not logged into firebase
      getAccountLocalStorage();
    } else if (user === null) {
      // loading state
    } else {
      // logged into firebase
      getAccountFirebase(user);
    }
  }, [dispatch, user]);

  const openCoinbaseProModal = () => {
    return (
      <>
        <Button
          variant="outline-dark"
          style={{ borderColor: '#272A3E', width: '100%', textAlign: 'left', color: 'white' }}
          onClick={handleShow}
        >
          &nbsp;
          <img
            src={`https://play-lh.googleusercontent.com/hi0SSeYyAbDcl1UTDVit1Or4noRiBwuNi-rAZ6QAEnGFQcZDZEIMKYkH5pbY5fn4SA`}
            height="28px"
            width="28px"
            style={{ borderRadius: '15px' }}
            alt=""
          />{' '}
          Connect Coinbase Pro
        </Button>
        <Modal show={show} onHide={handleClose} centered>
          <Form onSubmit={onSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>Add API Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <a href="https://help.coinbase.com/en/pro/other-topics/api/how-do-i-create-an-api-key-for-coinbase-pro">
                Create API Key for Coinbase Pro
              </a>
              <Form.Group>
                <FormControl type="text" ref={apiKeyRef} placeholder="Coinbase Pro API key" />
                <br />
                <FormControl type="text" ref={passphraseRef} placeholder="Coinbase Passphrase" />
                <br />
                <FormControl type="text" ref={secretRef} placeholder="Coinbase Pro Secret" />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-primary" type="submit" onClick={handleClose}>
                Submit
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </>
    );
  };

  return (
    <div className="App">
      <div>{!authorized && <div>{openCoinbaseProModal()}</div>}</div>

      {authorized && (
        <Button
          variant="outline-dark"
          style={{ borderColor: '#272A3E', width: '100%', padding: '0px', textAlign: 'left' }}
        >
          &nbsp;
          <img
            src={`https://play-lh.googleusercontent.com/hi0SSeYyAbDcl1UTDVit1Or4noRiBwuNi-rAZ6QAEnGFQcZDZEIMKYkH5pbY5fn4SA`}
            height="28px"
            width="28px"
            style={{ borderRadius: '10px' }}
            alt=""
          />{' '}
          <span style={{ textDecoration: 'none', color: 'white' }}>Coinbase Pro Connected</span>
        </Button>
      )}
    </div>
  );
};

export default CoinbasePro;
