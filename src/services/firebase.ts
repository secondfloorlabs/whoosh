import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signOut, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { captureMessage } from '@sentry/react';

export const firebaseConfig = {
  apiKey: 'AIzaSyCG4yu4fHJMv3T7wFVrgzZ9F6qPqAWr_2M',
  authDomain: 'whooshwallet.firebaseapp.com',
  projectId: 'whooshwallet',
  storageBucket: 'whooshwallet.appspot.com',
  messagingSenderId: '364830006127',
  appId: '1:364830006127:web:df52d65322e4d7251fa69a',
  measurementId: 'G-E7KDF2T4KM',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Logs in user through SSO and creates user metadata
 */
export const logIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (user) {
      const userUid = user.uid;
      const email = user.email;
      const displayName = user.displayName;

      const userRef = doc(db, 'user', userUid);
      setDoc(userRef, { userUid, email, displayName }, { merge: true });
    }
  } catch (error) {
    captureMessage(String(error));
  }
};

/**
 * Logs out current user
 */
export const logOut = async () => {
  await signOut(auth);
};

/**
 * Add any access tokens and wallet addresses to user
 * @param user
 * @param tokens
 */
export const addUserData = (user: User, tokens: Record<string, string>) => {
  const userUid = user.uid;

  const userRef = doc(db, 'user', userUid);
  setDoc(userRef, { tokens }, { merge: true });
};
