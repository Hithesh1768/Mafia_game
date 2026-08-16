import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService, playerService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mafia_token'));
  const [loading, setLoading] = useState(true);

  // Load user profile on startup if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const res = await playerService.getMe();
          setUser(res.data);
        } catch (err) {
          console.error("Auth token initialization failed", err);
          // Token is invalid/expired
          authService.logout();
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const jwtToken = await authService.login(username, password);
      setToken(jwtToken);
      const res = await playerService.getMe();
      setUser(res.data);
      return res.data;
    } catch (err) {
      authService.logout();
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    try {
      await authService.register(username, password);
      // Automatically login after registration
      return await login(username, password);
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = async (nickname) => {
    setLoading(true);
    try {
      const jwtToken = await authService.loginAsGuest(nickname);
      setToken(jwtToken);
      const res = await playerService.getMe();
      setUser(res.data);
      return res.data;
    } catch (err) {
      authService.logout();
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const jwtToken = await authService.loginWithGoogle(credential);
      setToken(jwtToken);
      const res = await playerService.getMe();
      setUser(res.data);
      return res.data;
    } catch (err) {
      authService.logout();
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithGoogle = async (credential, username, password) => {
    setLoading(true);
    try {
      const jwtToken = await authService.registerWithGoogle(credential, username, password);
      setToken(jwtToken);
      const res = await playerService.getMe();
      setUser(res.data);
      return res.data;
    } catch (err) {
      authService.logout();
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  // Provide user, loading, and auth functions
  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, register, loginAsGuest, loginWithGoogle, registerWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
