import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still checking the saved token, null = signed out
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    api
      .get('/me')
      .then((r) => setUser(r.user))
      .catch((err) => {
        // Only forget the token when the server says it is no longer valid,
        // not when the network is briefly down.
        if (err.status === 401) setToken(null);
        setUser(null);
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/login', { email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch {
      /* token may already be invalid; sign out locally either way */
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
