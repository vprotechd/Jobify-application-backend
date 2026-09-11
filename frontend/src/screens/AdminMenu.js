import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Header, styles } from "../components/common";
import { colors } from "../theme/theme";

const groups = [
  { title: "Overview", items: [["Admin Dashboard", "dashboard"], ["Notifications", "notifications"]] },
  { title: "People & content", items: [["Users", "users"], ["Recruiters", "recruiters"], ["Jobs", "jobs"], ["Applications", "applications"], ["Companies", "companies"]] },
  { title: "Business", items: [["CV Packages", "packages"], ["Payments", "payments"], ["Pricing", "pricing"], ["Commission", "commission"]] },
  { title: "Platform", items: [["Analytics", "analytics"], ["Reports & moderation", "reports"], ["Features", "features"], ["Settings", "settings"], ["Contact enquiries", "enquiries"]] },
];

export default function AdminMenu({ navigation }) {
  const { logout } = useAuth();
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Header eyebrow="Jobify Admin" title="Management" subtitle="Complete administration tools for the Jobify platform." />
    {groups.map(group => <View key={group.title} style={styles.card}>
      <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text, marginBottom: 10 }}>{group.title}</Text>
      {group.items.map(([label, resource]) => <TouchableOpacity key={resource} style={styles.outline} onPress={() => resource === "dashboard" ? navigation.navigate("Dashboard") : resource === "notifications" ? navigation.navigate("Notifications") : navigation.navigate("AdminTool", { resource })}>
        <Text style={styles.outlineText}>{label}</Text>
      </TouchableOpacity>)}
    </View>)}
    <TouchableOpacity style={[styles.outline, { borderColor: "#fecaca" }]} onPress={logout}><Text style={{ color: colors.danger, fontWeight: "900" }}>Logout</Text></TouchableOpacity>
  </ScrollView>;
}
