import { useContext } from 'react';
import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { AuthContext } from 'src/context/AuthContext';
import { logIn, logOut } from 'src/services/firebase';
import { isProduction } from 'src/utils/helpers';
import * as translations from 'src/utils/translations';

const WhooshNavbar = () => {
  const user = useContext(AuthContext);

  return (
    <Navbar expand="lg">
      <Container>
        <Navbar.Brand style={{ color: 'white' }} href="/">
          <span style={{ fontFamily: 'Damion', fontSize: '200%' }}> whoosh </span> &nbsp; crypto
          portfolio tracker
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          {!user ? (
            <Button size="sm" variant="link" style={{ width: '25%', height: '25%' }}>
              <img
                src="/btn_google_signin_dark_normal_web.png"
                alt="Sign in"
                onClick={logIn}
                style={{ width: '60%', height: '60%' }}
              />
            </Button>
          ) : (
            <Navbar.Text style={{ color: 'white', fontSize: 'smaller' }}>
              {translations.welcome}
              {`, ${user.displayName?.split(' ')[0]}`}
            </Navbar.Text>
          )}
          {!isProduction() && user && (
            <Nav.Link>
              <Button size="sm" onClick={logOut}>
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
