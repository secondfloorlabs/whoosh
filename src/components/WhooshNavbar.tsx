import {
    Container,
    Navbar
  } from 'react-bootstrap';
  
  const WhooshNavbar = () => {
    return (
        <Container>
            <Navbar>
            <Container>
                <Navbar.Brand style={{color:"white", fontSize: "200%", fontFamily:"Damion"}} href="/"> whoosh </Navbar.Brand>
            </Container>
            </Navbar>
        </Container>
    );
  }
  
  export default WhooshNavbar;
  