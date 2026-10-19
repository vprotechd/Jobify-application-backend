import React, { createContext, useContext, useMemo } from "react";
import { setThemeMode } from "../theme/theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Force the single supported theme to light, regardless of old saved preferences.
  setThemeMode("light");
  const value = useMemo(
    () => ({
      mode: "light",
      isDark: false,
      setMode: async () => setThemeMode("light"),
      toggle: async () => setThemeMode("light"),
    }),
    []
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return (
    useContext(ThemeContext) || {
      mode: "light",
      isDark: false,
      setMode: async () => {},
      toggle: async () => {},
    }
  );
}
