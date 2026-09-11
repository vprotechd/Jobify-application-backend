import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BackButton } from "../components/common";
import { toast } from "../services/toast";
import { styles, Field } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";

export default function Login({ navigation, route }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(route.params?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (route.params?.email) setEmail(route.params.email);
    if (route.params?.verifiedMessage) {
      toast.success(route.params.verifiedMessage);
      navigation.setParams({ verifiedMessage: undefined });
    }
  }, [route.params, navigation]);

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail) || !password) {
      toast.error("Please enter a valid email and password.");
      return;
    }

    setBusy(true);
    try {
      await login(cleanEmail, password);
    } catch (error) {
      const data = error.response?.data;
      if (data?.requiresVerification) {
        toast.error(data.message || "Please verify your email first.");
        navigation.replace("VerifyOTP", { email: cleanEmail });
      } else {
        toast.error(data?.message || error.message || "Unable to login.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 55 }]} keyboardShouldPersistTaps="handled">
        <BackButton label="Back to Jobify" />

        <View style={[styles.card, { padding: 22 }]}> 
          <Text style={{ fontSize: 32, fontWeight: "900", color: colors.primary }}>Jobify</Text>
          <Text style={[styles.title, { marginTop: 8 }]}>Sign in to your account</Text>
          <Text style={styles.subtitle}>Enter your details to continue.</Text>

          <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />

          <Text style={styles.label}>Password</Text>
          <View style={{ position: "relative" }}>
            <Field
              label=""
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((value) => !value)}
              style={{ position: "absolute", right: 12, top: 10, padding: 7 }}
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={{ marginBottom: 16 }}>
            <Text style={{ textAlign: "right", color: colors.primary, fontWeight: "700" }}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? "Signing in..." : "Sign In"}</Text>
          </TouchableOpacity>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 18 }}>
            <Text style={{ textAlign: "center", color: colors.muted }}>
              Don't have an account?{" "}
              <Text style={{ color: colors.primary, fontWeight: "800" }} onPress={() => navigation.replace("Register")}>Create an account</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
