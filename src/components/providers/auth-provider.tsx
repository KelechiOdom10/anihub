"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { use } from "react";

import { type SanitizedUser } from "~/lib/auth";

interface AuthContextType {
  user: SanitizedUser | null;
  setUser: (user: SanitizedUser | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
  userPromise,
}: {
  children: ReactNode;
  userPromise: Promise<SanitizedUser | null>;
}) {
  const initialUser = use(userPromise);
  const [user, setUser] = useState<SanitizedUser | null>(initialUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
