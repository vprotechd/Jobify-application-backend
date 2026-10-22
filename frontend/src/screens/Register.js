
import { useTheme } from "../context/ThemeContext";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import {
  styles,
  Field,
  BackButton,
  ThemeToggle,
} from "../components/common";
import { colors } from "../theme/theme";
import { toast } from "../services/toast";
import GoogleAuthButton from "../components/GoogleAuthButton";

const roles = [
  {
    value: "jobseeker",
    title: "Find a job",
    subtitle: "Search jobs and manage applications",
    icon: "person-outline",
  },
  {
    value: "recruiter",
    title: "Hire employees",
    subtitle: "Find candidates for your company",
    icon: "briefcase-outline",
  },
];

export default function Register({ navigation }) {
  const { mode: __themeMode } = useTheme();

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

      navigation.replace("VerifyOTP", {
        email: response.data?.email || cleanEmail,
      });
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(
          "An account with this email already exists. Please sign in."
        );
        navigation.replace("Login", { email: cleanEmail });
        return;
      }

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to create your account."
      );
    } finally {
      setBusy(false);
    }
  };

  const panel = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 22,
            paddingBottom: 35,
            width: "100%",
            maxWidth: 540,
            alignSelf: "center",
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation and theme */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <BackButton label="Back to Jobify" />
          <ThemeToggle compact />
        </View>

        {/* Branding */}
        <Text
          style={{
            color: colors.primary,
            fontSize: 27,
            fontWeight: "900",
            letterSpacing: -0.7,
          }}
        >
          Jobify
        </Text>

        <Text
          style={{
            color: colors.text,
            fontSize: 29,
            lineHeight: 36,
            fontWeight: "900",
            marginTop: 17,
          }}
        >
          Create your account
        </Text>

        <Text
          style={[
            styles.subtitle,
            { marginTop: 8, marginBottom: 23 },
          ]}
        >
          Get started with Jobify to discover opportunities
          or connect with qualified candidates.
        </Text>

        {/* Account type */}
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: "800",
            marginBottom: 11,
          }}
        >
          What brings you to Jobify?
        </Text>

        <View style={{ gap: 10, marginBottom: 22 }}>
          {roles.map((item) => {
            const selected = role === item.value;

            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => setRole(item.value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={{
                  ...panel,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  borderColor: selected
                    ? colors.primary
                    : colors.border,
                  borderWidth: selected ? 2 : 1,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected
                      ? "#E8F0FE"
                      : colors.background || "#F1F5F9",
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={23}
                    color={colors.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "800",
                      fontSize: 15,
                    }}
                  >
                    {item.title}
                  </Text>

                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 3,
                    }}
                  >
                    {item.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name={
                    selected
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={22}
                  color={selected ? colors.primary : colors.muted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Registration form */}
        <View style={panel}>
          <Text
            style={{
              color: colors.text,
              fontSize: 19,
              fontWeight: "800",
              marginBottom: 5,
            }}
          >
            Your details
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              marginBottom: 17,
            }}
          >
            Fill in your information to get started.
          </Text>

          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />

          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
          />

          <Field
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Enter your password again"
            secureTextEntry
          />

          <TouchableOpacity
            style={[
              styles.button,
              {
                marginTop: 8,
                minHeight: 49,
                justifyContent: "center",
              },
            ]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.buttonText,
                { fontSize: 15, fontWeight: "800" },
              ]}
            >
              {busy ? "Creating account..." : "Create account"}
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 19,
            }}
          >
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: colors.border,
              }}
            />
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: "700",
                marginHorizontal: 12,
              }}
            >
              OR CONTINUE WITH
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: colors.border,
              }}
            />
          </View>

          <GoogleAuthButton role={role} />

          <Text
            style={{
              textAlign: "center",
              color: colors.muted,
              fontSize: 14,
              lineHeight: 22,
              marginTop: 20,
            }}
          >
            Already have an account?{" "}
            <Text
              style={{
                color: colors.primary,
                fontWeight: "800",
              }}
              onPress={() => navigation.replace("Login")}
            >
              Sign in
            </Text>
          </Text>
        </View>

        {/* Footer */}
        <Text
          style={{
            textAlign: "center",
            color: colors.muted,
            fontSize: 12,
            marginTop: 22,
            lineHeight: 19,
          }}
        >
          By creating an account, you can start exploring
          opportunities on Jobify.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
