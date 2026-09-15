import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { setToastHandler } from "./src/services/toast";
import { colors } from "./src/theme/theme";

function ToastHost() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    setToastHandler((item) => {
      setToast(item);
      setTimeout(() => setToast(current => current?.id === item.id ? null : current), 3200);
    });
    return () => setToastHandler(null);
  }, []);
  if (!toast) return null;
  const palette = toast.type === "error" ? { bg: "#991b1b", icon: "✕" } : toast.type === "warning" ? { bg: "#b45309", icon: "!" } : toast.type === "info" ? { bg: "#1d4ed8", icon: "i" } : { bg: "#15803d", icon: "✓" };
  return (
    <View style={{ position: "absolute", top: Platform.OS === "web" ? 18 : 48, left: 16, right: 16, zIndex: 99999, alignItems: "center", pointerEvents: "none" }}>
      <View style={{ maxWidth: 620, width: "100%", backgroundColor: palette.bg, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", ...Platform.select({ web: { boxShadow: "0px 5px 12px rgba(0, 0, 0, 0.2)" }, default: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 } }) }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,.2)", alignItems: "center", justifyContent: "center", marginRight: 10 }}><Text style={{ color: "#fff", fontWeight: "900" }}>{palette.icon}</Text></View>
        <Text style={{ flex: 1, color: "#fff", fontWeight: "700", lineHeight: 20 }}>{toast.message}</Text>
      </View>
    </View>
  );
}

export default function App(){
  const navigationTheme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };
  return <AuthProvider><NavigationContainer theme={navigationTheme}><RootNavigator/></NavigationContainer><ToastHost /></AuthProvider>;
}
