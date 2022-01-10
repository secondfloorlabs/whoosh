import { useContext, useState } from 'react';
import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { AuthContext } from 'src/context/AuthContext';
import { logOut } from 'src/services/firebase';
import { isProduction } from 'src/utils/helpers';
import * as translations from 'src/utils/translations';
import Login from 'src/components/Login';
import { Mixpanel } from 'src/utils/mixpanel';

const WhooshNavbar = () => {
  const user = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);

  return (
    <Navbar expand="lg">
      <Container>
        <Navbar.Brand style={{ color: 'white' }} href="/">
          <span style={{ fontFamily: 'Damion', fontSize: '200%' }}> whoosh </span> &nbsp; crypto
          portfolio tracker
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          {showModal && (
            <Login
              showModal
              onClose={() => {
                setShowModal(false);
              }}
            />
          )}
          <a href="https://discord.gg/2WXgu6q6aM">
            <img
              src={`${process.env.PUBLIC_URL}/discord.png`}
              alt="discord"
              width="40"
              height="40"
              style={{
                marginRight: 10,
              }}
            />
          </a>
          {!user ? (
            <Button
              size="sm"
              variant="outline-light"
              onClick={() => {
                Mixpanel.track('Sync Devices Clicked');
                setShowModal(true);
              }}
            >
              Sync Devices
            </Button>
          ) : (
            <Navbar.Text style={{ color: 'white', fontSize: 'smaller' }}>
              {translations.welcome}
              {`, ${user.displayName?.split(' ')[0]}`}
            </Navbar.Text>
          )}
          {!isProduction() && user && (
            <Nav.Link>
              <Button
                size="sm"
                onClick={() => {
                  Mixpanel.track('Sign Out Clicked');
                  logOut();
                }}
              >
                Sign Out
              </Button>
            </Nav.Link>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default WhooshNavbar;
