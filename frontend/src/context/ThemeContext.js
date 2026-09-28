import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getThemeMode, setThemeMode, subscribeTheme, toggleTheme } from "../theme/theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getThemeMode());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("jobify_theme").then((saved) => {
      if (!active) return;
      const next = saved === "dark" ? "dark" : "light";
      setThemeMode(next);
      setMode(next);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => subscribeTheme(setMode), []);

  const value = useMemo(() => ({
    mode,
    isDark: mode === "dark",
    setMode: async (next) => {
      const value = next === "dark" ? "dark" : "light";
      setThemeMode(value);
      setMode(value);
      try { await AsyncStorage.setItem("jobify_theme", value); } catch {}
    },
    toggle: async () => {
      const next = mode === "dark" ? "light" : "dark";
      toggleTheme();
      setMode(next);
      try { await AsyncStorage.setItem("jobify_theme", next); } catch {}
    },
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext) || { mode: "light", isDark: false, toggle: () => {} };
}
