import { useContext, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button, Form, FormControl, Modal } from 'react-bootstrap';

import * as actionTypes from 'src/store/actionTypes';
import { convertAccountData, getAccountsData } from 'src/services/coinbasePro';
import { addUserAccessData } from 'src/services/firebase';
import { AuthContext } from 'src/context/AuthContext';

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
    const apikey = apiKeyRef?.current?.value;
    const passphrase = passphraseRef?.current?.value;
    const secret = secretRef?.current?.value;
    if (apikey && passphrase && secret) {
      localStorage.setItem('coinbaseProApiKey', apikey);
      localStorage.setItem('coinbaseProPassphrase', passphrase);
      localStorage.setItem('coinbaseProSecret', secret);

      const access = {
        coinbaseProApiKey: apikey,
        coinbaseProPassphrase: passphrase,
        coinbaseProSecret: secret,
      };
      if (user) addUserAccessData(user, access);

      const wallets = await getAccountsData(apikey, passphrase, secret);

      const completeToken = await convertAccountData(wallets, apikey, passphrase, secret);

      dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
      dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });

      setAuthorized(true);
    } else {
      alert('Missing Key/Passphrase/Secret');
    }
  };

  useEffect(() => {
    const getAccountLocalStorage = async () => {
      if (localStorage.getItem('coinbaseProApiKey') !== null) {
        const apikey = String(localStorage.getItem('coinbaseProApiKey'));
        const passphrase = String(localStorage.getItem('coinbaseProPassphrase'));
        const secret = String(localStorage.getItem('coinbaseProSecret'));

        const access = {
          coinbaseProApiKey: apikey,
          coinbaseProPassphrase: passphrase,
          coinbaseProSecret: secret,
        };
        if (user) addUserAccessData(user, access);

        const wallets = await getAccountsData(apikey, passphrase, secret);

        const completeToken = await convertAccountData(wallets, apikey, passphrase, secret);

        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });

        setAuthorized(true);
      }
    };
    getAccountLocalStorage();
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCoinbaseProModal = () => {
    return (
      <>
        <Button size="sm" variant="primary" onClick={handleShow}>
          Connect Coinbase Pro
        </Button>
        <Modal show={show} onHide={handleClose}>
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
        <div style={{ height: '100%' }}>
          <p>✅ Coinbase Pro connected</p>
        </div>
      )}
    </div>
  );
};

export default CoinbasePro;
