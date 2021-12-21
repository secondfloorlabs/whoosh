import { Container, Navbar } from 'react-bootstrap';

const WhooshNavbar = () => {
  return (
    <Container>
      <Navbar>
        <Container>
          <Navbar.Brand style={{ color: 'white' }} href="/">
            <span style={{ fontFamily: 'Damion', fontSize: '200%' }}> whoosh </span> &nbsp; crypto
            portfolio tracker
          </Navbar.Brand>
        </Container>
      </Navbar>
    </Container>
  );
};

export default WhooshNavbar;
