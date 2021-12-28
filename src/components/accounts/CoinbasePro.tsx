import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button, Form, FormControl, Modal } from 'react-bootstrap';

import * as actionTypes from 'src/store/actionTypes';
import { convertAccountData, getAccountsData } from 'src/services/coinbasePro';

const CoinbasePro = () => {
  const dispatch = useDispatch();
  const [authorized, setAuthorized] = useState<Boolean>(false);
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const onClickConnectFromInput = async (e: any) => {
    e.preventDefault();

    const apikey: string = e.target.apikey.value;
    const passphrase: string = e.target.passphrase.value;
    const secret: string = e.target.secret.value;
    if (apikey && passphrase && secret) {
      localStorage.setItem('coinbaseProApiKey', apikey);
      localStorage.setItem('coinbaseProPassphrase', passphrase);
      localStorage.setItem('coinbaseProSecret', secret);
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

        const wallets = await getAccountsData(apikey, passphrase, secret);

        const completeToken = await convertAccountData(wallets, apikey, passphrase, secret);

        dispatch({ type: actionTypes.ADD_ALL_TOKEN, token: completeToken });
        dispatch({ type: actionTypes.ADD_CURRENT_TOKEN, token: completeToken });

        setAuthorized(true);
      }
    };
    getAccountLocalStorage();
  }, []);

  const openCoinbaseProModal = () => {
    return (
      <>
        <Button size="sm" variant="primary" onClick={handleShow}>
          Connect Coinbase Pro
        </Button>

        <Modal show={show} onHide={handleClose}>
          <Form onSubmit={onClickConnectFromInput}>
            <Modal.Header closeButton>
              <Modal.Title>Add API Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <a href="https://help.coinbase.com/en/pro/other-topics/api/how-do-i-create-an-api-key-for-coinbase-pro">
                Create API Key for Coinbase Pro
              </a>
              <Form.Group>
                <FormControl type="text" name="apikey" placeholder="Coinbase Pro API key" />
                <br />
                <FormControl type="text" name="passphrase" placeholder="Coinbase Passphrase" />
                <br />
                <FormControl type="text" name="secret" placeholder="Coinbase Pro Secret" />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="outline-primary"
                type="submit"
                onClick={handleClose}
                onSubmit={onClickConnectFromInput}
              >
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
