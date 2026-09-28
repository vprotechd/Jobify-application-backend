import { Platform } from "react-native";

let mode = "light";
const listeners = new Set();

const palettes = {
  light: {
    primary: "#1f5eff", primaryDark: "#1746c7", bg: "#eef3f8", card: "#ffffff",
    text: "#0b1736", muted: "#64748b", border: "#d9e2ec", success: "#15803d",
    danger: "#dc2626", warning: "#c46a00", purple: "#6d4aff", surface: "#f7f9fc", navy: "#0b1736",
    input: "#ffffff", chip: "#eff6ff", softDanger: "#fef2f2", softSuccess: "#f0fdf4", softPrimary: "#eff6ff"
  },
  dark: {
    primary: "#6ea0ff", primaryDark: "#8db5ff", bg: "#0b1220", card: "#121c2d",
    text: "#f1f5f9", muted: "#a8b4c7", border: "#2a3950", success: "#4ade80",
    danger: "#fb7185", warning: "#fbbf24", purple: "#a78bfa", surface: "#0f1929", navy: "#e5edf8",
    input: "#0f1929", chip: "#172b4d", softDanger: "#351b24", softSuccess: "#10291c", softPrimary: "#172b4d"
  }
};

export const colors = { ...palettes.light };

export function getThemeMode() { return mode; }

export function setThemeMode(next) {
  mode = next === "dark" ? "dark" : "light";
  Object.assign(colors, palettes[mode]);
  listeners.forEach((listener) => {
    try { listener(mode); } catch {}
  });
}

export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleTheme() {
  setThemeMode(mode === "light" ? "dark" : "light");
}

export const shadow = Platform.select({
  web: { boxShadow: "0px 5px 14px rgba(11, 23, 54, 0.07)" },
  default: { shadowColor: "#0b1736", shadowOpacity: .07, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 }
});
