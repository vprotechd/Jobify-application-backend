import React from "react";
import { Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function SplashScreen({ onGetStarted }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FF" />
      <LinearGradient colors={["#F4F7FF", "#FFFFFF", "#EEF4FF"]} style={styles.container}>
        <View style={styles.topRow}>
          <Image source={require("../../assets/jobify.png")} style={styles.logo} />
          <Text style={styles.brand}>Jobify</Text>
        </View>

        <View style={styles.hero}>
          <Image source={require("../../assets/welcome.png")} style={styles.welcomeImage} resizeMode="contain" />
          <Text style={styles.eyebrow}>YOUR CAREER, YOUR FUTURE</Text>
          <Text style={styles.title}>Find work that{ '\n' }works for you.</Text>
          <Text style={styles.subtitle}>Discover opportunities, connect with great companies, and take the next step in your career.</Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.benefits}>
            <View style={styles.benefit}><Ionicons name="search-outline" size={18} color="#1F5EFF" /><Text style={styles.benefitText}>Find jobs</Text></View>
            <View style={styles.benefit}><Ionicons name="people-outline" size={18} color="#1F5EFF" /><Text style={styles.benefitText}>Meet employers</Text></View>
            <View style={styles.benefit}><Ionicons name="trending-up-outline" size={18} color="#1F5EFF" /><Text style={styles.benefitText}>Grow your career</Text></View>
          </View>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} style={styles.button} onPress={onGetStarted}>
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.footer}>A better opportunity is one tap away.</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FF" },
  container: { flex: 1, paddingHorizontal: 26, paddingTop: 18, paddingBottom: 20 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 12 },
  brand: { color: "#0B1736", fontSize: 25, fontWeight: "900", letterSpacing: -0.6 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 12 },
  welcomeImage: { width: "100%", maxWidth: 360, height: 245, marginBottom: 18 },
  artCircle: { width: 220, height: 205, alignItems: "center", justifyContent: "center", marginBottom: 25 },
  artCard: { width: 148, height: 150, backgroundColor: "#FFFFFF", borderRadius: 24, alignItems: "center", padding: 18, borderWidth: 1, borderColor: "#E2EAFE", transform: [{ rotate: "-5deg" }], shadowColor: "#1F5EFF", shadowOpacity: 0.13, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
  iconCircle: { width: 66, height: 66, borderRadius: 22, backgroundColor: "#1F5EFF", alignItems: "center", justifyContent: "center", marginBottom: 13 },
  lineLong: { width: 86, height: 7, borderRadius: 4, backgroundColor: "#DCE6FF", marginBottom: 6 },
  lineShort: { width: 56, height: 6, borderRadius: 4, backgroundColor: "#EDF1FA" },
  artFooter: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginTop: 11, gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#23B26D" },
  footerLine: { width: 40, height: 5, borderRadius: 4, backgroundColor: "#DCE6FF" },
  floatingCheck: { position: "absolute", right: 24, top: 25, width: 43, height: 43, borderRadius: 15, backgroundColor: "#23B26D", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#F4F7FF" },
  floatingStar: { position: "absolute", left: 17, bottom: 26, width: 44, height: 44, borderRadius: 15, backgroundColor: "#FFF4D6", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#F4F7FF" },
  eyebrow: { color: "#1F5EFF", fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 13, textAlign: "center" },
  title: { color: "#0B1736", fontSize: 35, lineHeight: 42, fontWeight: "900", textAlign: "center", letterSpacing: -1.1 },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 14, maxWidth: 340 },
  bottom: { width: "100%", maxWidth: 480, alignSelf: "center" },
  benefits: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingHorizontal: 2 },
  benefit: { alignItems: "center", gap: 5, flex: 1 },
  benefitText: { color: "#52617A", fontSize: 10, fontWeight: "700" },
  button: { minHeight: 58, backgroundColor: "#1F5EFF", borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, shadowColor: "#1F5EFF", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  footer: { color: "#94A3B8", fontSize: 11, textAlign: "center", marginTop: 14 },
});
