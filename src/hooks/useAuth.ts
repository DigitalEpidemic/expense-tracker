import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth, googleProvider } from "../config/firebase";

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
      toast.success("Successfully signed in!");
    } catch (error: unknown) {
      console.error("Sign in error:", error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/popup-blocked") {
        toast.error(
          "Pop-up blocked! Please allow pop-ups for this site and try again."
        );
      } else {
        toast.error("Failed to sign in");
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success("Successfully signed out!");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    }
  };

  return { user, loading, signInWithGoogle, logout };
};
