import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { login as apiLogin, register as apiRegister } from './api';
import { clearLocalData, getAuth, setAuth } from './storage';

interface AuthContextValue {
  email: string | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuth().then((auth) => {
      if (auth) {
        setEmail(auth.email);
        setToken(auth.token);
      }
      setLoading(false);
    });
  }, []);

  const apply = useCallback(async (res: { token: string; user: { email: string } }) => {
    await setAuth({ token: res.token, email: res.user.email });
    setEmail(res.user.email);
    setToken(res.token);
  }, []);

  const signIn = useCallback(
    async (e: string, p: string) => apply(await apiLogin(e, p)),
    [apply],
  );
  const signUp = useCallback(
    async (e: string, p: string) => apply(await apiRegister(e, p)),
    [apply],
  );
  const signOut = useCallback(async () => {
    await clearLocalData();
    setEmail(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ email, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
