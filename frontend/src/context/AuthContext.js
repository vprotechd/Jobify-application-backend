import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "token";
const USER_KEY = "user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, raw] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
        const tokenValue = token?.[1];
        const rawUser = raw?.[1];
        if (!tokenValue || !rawUser) return;
        const parsed = JSON.parse(rawUser);
        if (parsed?.role) setUser(parsed); else await clearStored();
      } catch { await clearStored(); }
      finally { setLoading(false); }
    })();
  }, []);

  const clearStored = async () => AsyncStorage.multiRemove([TOKEN_KEY, "accessToken", USER_KEY, "rememberMe"]);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
    const data = response.data || {};
    const token = data.token || data.accessToken || data.data?.token;
    const userData = data.user || data.data?.user || data.data;
    if (!token || !userData?.role) throw new Error(data.message || "Invalid login response from server.");
    await AsyncStorage.multiSet([[TOKEN_KEY, token], [USER_KEY, JSON.stringify(userData)]]);
    setUser(userData);
    return data;
  };

  const logout = async () => { await clearStored(); setUser(null); };
  const clearSession = logout;
  return <AuthContext.Provider value={{ user, loading, isAuthenticated: Boolean(user), login, logout, clearSession }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
