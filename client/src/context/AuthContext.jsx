import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';

/**
 * AuthContext — state JWT + user di localStorage.
 *
 * Pakai useReducer biar transisi state jelas (LOGIN, LOGOUT, RESTORE).
 * Note: localStorage di-baca sekali waktu mount; setelah itu state pakai memori.
 */

const STORAGE_KEY_TOKEN = 'cryptoRisk_jwt';
const STORAGE_KEY_USER = 'cryptoRisk_user';

const initialState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // true sampai restore selesai
};

function authReducer(state, action) {
  switch (action.type) {
    case 'RESTORE':
      return {
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: !!action.payload.token,
        isLoading: false,
      };
    case 'LOGIN':
      return {
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { token: null, user: null, isAuthenticated: false, isLoading: false };
    default:
      return state;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // === Restore dari localStorage on mount ===
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const userRaw = localStorage.getItem(STORAGE_KEY_USER);
    const user = userRaw ? JSON.parse(userRaw) : null;
    dispatch({ type: 'RESTORE', payload: { token, user } });
  }, []);

  // === Listen ke event logout dari apiClient (token expired) ===
  useEffect(() => {
    const onLogout = () => dispatch({ type: 'LOGOUT' });
    window.addEventListener('cryptoRisk:logout', onLogout);
    return () => window.removeEventListener('cryptoRisk:logout', onLogout);
  }, []);

  const login = useCallback((token, user) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    dispatch({ type: 'LOGIN', payload: { token, user } });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
