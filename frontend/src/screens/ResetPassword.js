import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import api from "../services/api";
import { Field, Header, styles } from "../components/common";
import { colors } from "../theme/theme";

export default function ResetPassword({ navigation, route }) {
  const token = String(route.params?.token || "").trim();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!token) return Alert.alert("Invalid link", "The password reset link is missing or invalid.");
    if (password.length < 6) return Alert.alert("Password", "Password must contain at least 6 characters.");
    if (password !== confirm) return Alert.alert("Password", "Passwords do not match.");
    setBusy(true);
    try { const r = await api.post(`/auth/reset-password/${token}`, { password }); Alert.alert("Password reset", r.data?.message || "Password reset successfully.", [{ text: "Sign in", onPress: () => navigation.replace("Login") }]); }
    catch (e) { Alert.alert("Reset failed", e.response?.data?.message || e.message || "Unable to reset password."); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={[styles.content, { paddingTop: 60 }]}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: colors.muted, fontWeight: "700", marginBottom: 20 }}>‹ Back</Text></TouchableOpacity><View style={[styles.card, { padding: 22 }]}><Header title="Create a new password" subtitle="Choose a new secure password for your Jobify account."/><Field label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimum 6 characters"/><Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Re-enter password"/><TouchableOpacity style={styles.button} onPress={submit} disabled={busy}><Text style={styles.buttonText}>{busy ? "Saving..." : "Reset Password"}</Text></TouchableOpacity></View></ScrollView></KeyboardAvoidingView>;
}
