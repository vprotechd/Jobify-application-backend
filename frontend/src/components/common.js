import React from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors, shadow } from "../theme/theme";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 44 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: 18 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, marginBottom: 14, ...shadow },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, marginBottom: 12 },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  outline: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  outlineText: { color: colors.text, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 7 },
  muted: { color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chip: { backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 6, marginBottom: 6 },
  chipText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  error: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  success: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 12, padding: 12, marginBottom: 14 },
  successText: { color: colors.success, fontSize: 13, lineHeight: 19 },
  itemTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 },
  meta: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  smallButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11 },
  smallButtonText: { color: colors.text, fontWeight: "800", fontSize: 12 },
});

export function BackButton({ label = "Back" }) {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;
  return <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: 12, paddingVertical: 4, paddingRight: 12 }}>
    <Ionicons name="arrow-back" size={19} color={colors.muted} />
    <Text style={{ color: colors.muted, fontWeight: "800", marginLeft: 6 }}>{label}</Text>
  </TouchableOpacity>;
}

export function Header({ title, subtitle, eyebrow = "Jobify", showBack = true }) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [unread, setUnread] = React.useState(0);

  const loadUnread = React.useCallback(async () => {
    if (!user) { setUnread(0); return; }
    try {
      const response = await api.get("/notifications/unread-count");
      setUnread(Number(response.data?.unreadCount || 0));
    } catch {
      // Keep the header usable when notifications are temporarily unavailable.
    }
  }, [user]);

  useFocusEffect(React.useCallback(() => {
    loadUnread();
  }, [loadUnread]));

  return <View style={{ marginBottom: 12 }}>{showBack ? <BackButton /> : null}
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: .7, marginBottom: 5 }}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {user ? <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        onPress={() => navigation.navigate("Notifications")}
        style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
        {unread > 0 ? <View style={{ position: "absolute", top: -4, right: -4, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg }}>
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{unread > 99 ? "99+" : unread}</Text>
        </View> : null}
      </TouchableOpacity> : null}
    </View>
  </View>;
}
export function Loader() { return <View style={{ padding: 42, alignItems: "center" }}><ActivityIndicator size="large" color={colors.primary} /></View>; }
export function Field({ label, ...p }) { return <View><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, p.multiline && styles.textarea]} placeholderTextColor="#94a3b8" {...p} /></View>; }
export function Empty({ text = "Nothing to show" }) { return <View style={[styles.card, { alignItems: "center", padding: 30 }]}><Text style={styles.muted}>{text}</Text></View>; }
export function ErrorBox({ message }) { return message ? <View style={styles.error}><Text style={styles.errorText}>{message}</Text></View> : null; }
export function SuccessBox({ message }) { return message ? <View style={styles.success}><Text style={styles.successText}>{message}</Text></View> : null; }
