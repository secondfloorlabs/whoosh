import { useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { auth } from 'src/services/firebase';
import { User } from 'firebase/auth';

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });

    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
};
