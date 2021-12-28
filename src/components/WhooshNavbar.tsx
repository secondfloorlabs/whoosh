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
          <a href="https://forms.gle/tujpXpGZwQCipSZ79" target="_blank" rel="noreferrer">
            Feedback form
          </a>
        </Container>
      </Navbar>
    </Container>
  );
};

export default WhooshNavbar;
