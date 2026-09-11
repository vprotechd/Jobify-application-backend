import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import api from "../services/api";
import { BackButton, styles } from "../components/common";
import { toast } from "../services/toast";
import { colors } from "../theme/theme";

export default function VerifyOTP({ navigation, route }) {
  const email = String(route.params?.email || "").trim().toLowerCase();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const refs = useRef([]);

  useEffect(() => { if (!email) navigation.replace("Register"); }, [email, navigation]);
  useEffect(() => { if (seconds <= 0) return; const timer = setInterval(() => setSeconds(v => v - 1), 1000); return () => clearInterval(timer); }, [seconds]);

  const updateDigit = (value, index) => {
    const digits = value.replace(/\D/g, "");
    const next = [...otp];
    digits.slice(0, 6 - index).split("").forEach((digit, offset) => { next[index + offset] = digit; });
    setOtp(next);
    if (digits && index < 5) refs.current[Math.min(index + digits.length, 5)]?.focus();
  };
  const onKeyPress = (event, index) => { if (event.nativeEvent.key === "Backspace" && !otp[index] && index > 0) refs.current[index - 1]?.focus(); };

  const verify = async () => {
    const code = otp.join("");
    if (code.length !== 6) return toast.error("Please enter the complete 6-digit OTP.");
    if (!email) return toast.error("Your email is missing. Please register again.");
    setBusy(true);
    try {
      const response = await api.post("/auth/verify-otp", { email, otp: code });
      toast.success(response.data?.message || "Your account has been verified successfully.");
      navigation.replace("Login", { email, verifiedMessage: "Account verified successfully. Please sign in." });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to verify OTP.");
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (seconds > 0 || resending || !email) return;
    setResending(true);
    try {
      const response = await api.post("/auth/resend-otp", { email });
      setOtp(["", "", "", "", "", ""]); setSeconds(60);
      toast.success(response.data?.message || "A new OTP has been sent.");
      setTimeout(() => refs.current[0]?.focus(), 100);
    } catch (error) { toast.error(error.response?.data?.message || "Unable to resend OTP."); }
    finally { setResending(false); }
  };

  if (!email) return null;
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 42 }]}>
      <BackButton label="Back to Register" />
      <View style={[styles.card, { padding: 22 }]}>
        <Text style={{ fontSize: 32, fontWeight: "900", color: colors.primary, marginBottom: 10 }}>Jobify</Text>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>Enter the 6-digit verification code sent to your email address.</Text>
        <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 22 }}>{email}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 22 }}>
          {otp.map((digit, index) => <TextInput key={index} ref={ref => { refs.current[index] = ref; }} value={digit} onChangeText={v => updateDigit(v, index)} onKeyPress={e => onKeyPress(e, index)} keyboardType="number-pad" maxLength={6 - index} textAlign="center" style={{ width: 45, height: 52, borderWidth: 1, borderColor: digit ? colors.primary : colors.border, borderRadius: 12, backgroundColor: "#fff", fontSize: 20, fontWeight: "800", color: colors.text }} />)}
        </View>
        <TouchableOpacity style={styles.button} onPress={verify} disabled={busy}><Text style={styles.buttonText}>{busy ? "Verifying..." : "Verify Email"}</Text></TouchableOpacity>
        <Text style={{ textAlign: "center", color: colors.muted, marginTop: 8 }}>Didn't receive the code?</Text>
        <TouchableOpacity onPress={resend} disabled={seconds > 0 || resending} style={{ padding: 10 }}><Text style={{ textAlign: "center", color: seconds > 0 || resending ? colors.muted : colors.primary, fontWeight: "800" }}>{resending ? "Sending..." : seconds > 0 ? `Resend OTP in ${seconds}s` : "Resend OTP"}</Text></TouchableOpacity>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
