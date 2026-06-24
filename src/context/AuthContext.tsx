import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User, Credentials } from "@/shared/types";

const STORAGE_KEY = "msh.currentUser";

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  needsSetup: boolean;
  login: (credentials: Credentials) => Promise<string | null>;
  setup: (input: {
    displayName: string;
    username: string;
    password: string;
  }) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const needs = await window.api.auth.needsSetup();
      setNeedsSetup(needs);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !needs) {
        try {
          setUser(JSON.parse(stored) as User);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setReady(true);
    })();
  }, []);

  const persist = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const login = useCallback(
    async (credentials: Credentials): Promise<string | null> => {
      const result = await window.api.auth.login(credentials);
      if (result.ok && result.user) {
        persist(result.user);
        return null;
      }
      return result.error ?? "Anmeldung fehlgeschlagen";
    },
    [persist],
  );

  const setup = useCallback(
    async (input: {
      displayName: string;
      username: string;
      password: string;
    }): Promise<string | null> => {
      const result = await window.api.auth.setup({
        ...input,
        role: "admin",
      });
      if (result.ok && result.user) {
        setNeedsSetup(false);
        persist(result.user);
        return null;
      }
      return result.error ?? "Einrichtung fehlgeschlagen";
    },
    [persist],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, ready, needsSetup, login, setup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider genutzt werden");
  return ctx;
}
