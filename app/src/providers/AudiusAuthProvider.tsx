"use client";

import { createContext, FC, ReactNode, useCallback, useEffect, useState } from "react";
import {
  AudiusAuthUser,
  clearAuthUser,
  loadAuthUser,
  openOAuthPopup,
  saveAuthUser,
} from "@/services/audiusAuth";

interface AudiusAuthContextValue {
  user: AudiusAuthUser | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

export const AudiusAuthContext = createContext<AudiusAuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const AudiusAuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AudiusAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = loadAuthUser();
    setUser(stored);
    setIsLoading(false);
  }, []);

  const login = useCallback(async () => {
    // openOAuthPopup opens the popup synchronously at the start before any await
    const authUser = await openOAuthPopup();
    saveAuthUser(authUser);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthUser();
    setUser(null);
  }, []);

  return (
    <AudiusAuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AudiusAuthContext.Provider>
  );
};
