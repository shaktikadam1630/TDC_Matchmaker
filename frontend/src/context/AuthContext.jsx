import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(tokenStore.get())); // validating a stored token

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return undefined;
    const ctrl = new AbortController();
    api.me(ctrl.signal)
      .then((d) => setUser(d.user))
      .catch((e) => { if (e.name !== 'AbortError') logout(); })
      .finally(() => setBooting(false));
    return () => ctrl.abort();
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const { token, user: u } = await api.login(username, password);
    tokenStore.set(token);
    setUser(u);
  }, []);

  const value = useMemo(() => ({ user, booting, login, logout }), [user, booting, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
