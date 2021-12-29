import { useContext } from 'react';
import { Button, Container, Navbar } from 'react-bootstrap';
import { AuthContext } from 'src/context/AuthContext';
import { logIn, logOut } from 'src/services/firebase';

const WhooshNavbar = () => {
  const user = useContext(AuthContext);

  return (
    <Container>
      <Navbar>
        <Container>
          <Navbar.Brand style={{ color: 'white' }} href="/">
            <span style={{ fontFamily: 'Damion', fontSize: '200%' }}> whoosh </span> &nbsp; crypto
            portfolio tracker
          </Navbar.Brand>
          <a href="https://forms.gle/tujpXpGZwQCipSZ79" target="_blank" rel="noreferrer">
            Feedback form
          </a>
          {user && <Button onClick={logOut}>Sign Out</Button>}
          {!user ? (
            <Container style={{ maxWidth: '500px' }} fluid>
              <Button onClick={logIn} type="button" variant="secondary">
                Sign In
              </Button>
            </Container>
          ) : (
            <h2 className="mt-4 text-center">Welcome {user.email}</h2>
          )}
        </Container>
      </Navbar>
    </Container>
  );
};

export default WhooshNavbar;
