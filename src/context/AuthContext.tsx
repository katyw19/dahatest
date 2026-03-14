import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getFirebaseAuth } from "../services/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Listen for auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();

    if (!auth) {
      console.warn("Firebase auth not ready on app start");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // 🔹 Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase auth not ready. Check Firebase config.");
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("SIGN IN ERROR", err);
      throw err;
    }
  }, []);

  // 🔹 Sign up
  const signUp = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase auth not ready. Check Firebase config.");
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("SIGN UP ERROR", err);
      throw err;
    }
  }, []);

  // 🔹 Sign out
  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("SIGN OUT ERROR", err);
      throw err;
    }
  }, []);

  // 🔹 Reset password
  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase auth not ready. Check Firebase config.");
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      console.error("RESET PASSWORD ERROR", err);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [user, loading, signIn, signUp, signOut, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
