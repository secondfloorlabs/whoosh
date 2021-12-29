import { useContext, useRef } from 'react';
import { Button, Container, Navbar } from 'react-bootstrap';
import { AuthContext } from 'src/context/AuthContext';
import { auth } from 'src/services/firebase';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const WhooshNavbar = () => {
  const user = useContext(AuthContext);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Start a sign in process for an unauthenticated user.
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log(user);

      // await signInWithRedirect(auth, provider);
      // This will trigger a full page redirect away from your app

      // After returning from the redirect when your app initializes you can obtain the result
      // const result = await getRedirectResult(auth);
      // if (result) {
      //   // This is the signed-in user
      //   const user = result.user;
      //   // This gives you a Google Access Token.
      //   const credential = GoogleAuthProvider.credentialFromResult(result);
      //   const token = credential ? credential.accessToken : undefined;

      //   console.log(user);
      // }

      // await signInWithPopup(auth, GoogleAuthProvider)
      // await signInWithEmailAndPassword(auth, emailRef.current!.value, passwordRef.current!.value);
    } catch (error) {
      console.error(error);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

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
              <Button onClick={signIn} type="button" variant="secondary">
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
