import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  setPersistence,
  browserLocalPersistence,
  TwitterAuthProvider,
  AuthProvider,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, query, collection, getDocs, getDoc } from 'firebase/firestore';
import { captureMessage } from '@sentry/react';

export const firebaseConfig = {
  apiKey: 'AIzaSyCG4yu4fHJMv3T7wFVrgzZ9F6qPqAWr_2M',
  authDomain: 'app.whoosh.fi',
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
setPersistence(auth, browserLocalPersistence);

// Add or Remove authentification methods here.
export const Providers = {
  google: new GoogleAuthProvider(),
  twitter: new TwitterAuthProvider(),
};

/**
 * Logs in user through SSO and creates user metadata
 */
export const logIn = async (provider: AuthProvider) => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (user) {
      const userUid = user.uid;
      const email = user.email;
      const displayName = user.displayName;

      // create user doc and wallet doc based on userUid
      const userRef = doc(db, 'user', userUid);
      const walletRef = doc(db, 'wallet', userUid);

      await Promise.all([
        setDoc(userRef, { userUid, email, displayName }, { merge: true }),
        setDoc(walletRef, { userUid }, { merge: true }), // create reference to wallet
      ]);
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
 * @param access
 */
export const addUserAccessData = (user: User, access: Record<string, string | null>) => {
  const userUid = user.uid;

  const userRef = doc(db, 'user', userUid);
  setDoc(userRef, { access }, { merge: true });
};

/**
 * Retrieve wallet based on the logged in user and the wallet
 * @param user
 * @param wallet
 * @returns list of data for specific wallet
 */
export const getUserData = async (user: User, wallet: string) => {
  const userUid = user.uid;

  const q = query(collection(db, `wallet/${userUid}/${wallet}`));
  const querySnapshot = await getDocs(q);

  const walletData = querySnapshot.docs.map((doc) => {
    return doc.data();
  });

  return walletData;
};

export const getUserMetadata = async (user: User) => {
  const userUid = user.uid;

  const userRef = doc(db, 'user', userUid);
  const userDoc = await getDoc(userRef);

  return userDoc.data();
};
