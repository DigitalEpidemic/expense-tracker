import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Successfully signed in!');
    } catch (error) {
      console.error('Sign in error:', error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Pop-up blocked! Please allow pop-ups for this site and try again.');
      } else {
        toast.error('Failed to sign in');
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Successfully signed out!');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  return { user, loading, signInWithGoogle, logout };
};