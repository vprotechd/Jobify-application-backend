import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";
import { styles, Field, BackButton } from "../components/common";
import { colors } from "../theme/theme";
import { toast } from "../services/toast";

const roles = [
  { value: "jobseeker", title: "Job Seeker", subtitle: "Find jobs", icon: "👤" },
  { value: "recruiter", title: "Recruiter", subtitle: "Hire talent", icon: "💼" },
];

export default function Register({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("jobseeker");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must contain at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await api.post("/auth/register", {
        name: cleanName,
        email: cleanEmail,
        password,
        role,
      });

      navigation.replace("VerifyOTP", { email: response.data?.email || cleanEmail });
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error("An account with this email already exists. Please sign in.");
        navigation.replace("Login", { email: cleanEmail });
        return;
      }
      toast.error(error.response?.data?.message || error.message || "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 42 }]} keyboardShouldPersistTaps="handled">
        <BackButton label="Back to Jobify" />

        <Text style={{ fontSize: 32, fontWeight: "900", color: colors.primary }}>Jobify</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join Jobify and start your journey.</Text>

        <Text style={styles.label}>Account type</Text>
        {roles.map((item) => {
          const selected = role === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setRole(item.value)}
              style={{
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? "#eff6ff" : colors.card,
                borderRadius: 14,
                padding: 15,
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  backgroundColor: selected ? colors.primary : "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Text>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: selected ? colors.primary : colors.text }}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{item.subtitle}</Text>
              </View>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : "transparent",
                }}
              />
            </TouchableOpacity>
          );
        })}



        <Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" />
        <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 6 characters" secureTextEntry />
        <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
          <Text style={styles.buttonText}>{busy ? "Creating..." : "Create account"}</Text>
        </TouchableOpacity>

        <Text style={{ textAlign: "center", color: colors.muted, marginTop: 12 }}>
          Already have an account?{" "}
          <Text style={{ color: colors.primary, fontWeight: "800" }} onPress={() => navigation.replace("Login")}>Sign in</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
