import { Platform } from "react-native";

// Jobify now uses one consistent light theme throughout the application.
const lightPalette = {
  primary: "#1f5eff",
  primaryDark: "#1746c7",
  bg: "#eef3f8",
  card: "#ffffff",
  text: "#0b1736",
  muted: "#64748b",
  border: "#d9e2ec",
  success: "#15803d",
  danger: "#dc2626",
  warning: "#c46a00",
  purple: "#6d4aff",
  surface: "#f7f9fc",
  navy: "#0b1736",
  input: "#ffffff",
  chip: "#eff6ff",
  softDanger: "#fef2f2",
  softSuccess: "#f0fdf4",
  softPrimary: "#eff6ff",
};

export const colors = { ...lightPalette };

export function getThemeMode() {
  return "light";
}

// Kept as a compatibility export for existing screens; dark mode is disabled.
export function setThemeMode(_next) {
  Object.assign(colors, lightPalette);
}

export function subscribeTheme(_listener) {
  return () => {};
}

// Theme switching is disabled; the application always stays in light mode.
export function toggleTheme() {
  Object.assign(colors, lightPalette);
}

export const shadow = Platform.select({
  web: { boxShadow: "0px 5px 14px rgba(11, 23, 54, 0.07)" },
  default: {
    shadowColor: "#0b1736",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
});
