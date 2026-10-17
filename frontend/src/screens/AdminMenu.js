
import { useTheme } from "../context/ThemeContext";
import React from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { Header, styles } from "../components/common";
import { colors } from "../theme/theme";

const groups = [
  {
    title: "Overview",
    items: [
  
      ["Notifications", "notifications"],
    ],
  },
  
  {
    title: "Business",
    items: [
      ["CV Packages", "packages"],
      ["Payments", "payments"],
      ["Pricing", "pricing"],
      ["Commission", "commission"],
    ],
  },
  {
    title: "Platform",
    items: [
      ["Analytics", "analytics"],
      ["Reports & moderation", "reports"],
      ["Features", "features"],
      ["Settings", "settings"],
      ["Contact enquiries", "enquiries"],
    ],
  },
];

export default function AdminMenu({ navigation }) {
  const { mode: __themeMode } = useTheme();
  const { logout } = useAuth();

  const handleNavigation = (resource) => {
    if (resource === "dashboard") {
      navigation.navigate("Dashboard");
    } else if (resource === "notifications") {
      navigation.navigate("Notifications");
    } else {
      navigation.navigate("AdminTool", { resource });
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: 40,
          paddingBottom: 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Header
        eyebrow="Jobify Admin"
        title="Admin Management"
        subtitle="Manage the same Jobify platform areas available on the website."
      />

      {groups.map((group) => (
        <View
          key={group.title}
          style={[
            styles.card,
            {
              marginBottom: 14,
              padding: 16,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "900",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            {group.title}
          </Text>

          {group.items.map(([label, resource]) => (
            <TouchableOpacity
              key={resource}
              style={[
                styles.outline,
                {
                  marginBottom: 8,
                },
              ]}
              onPress={() => handleNavigation(resource)}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.outline,
          {
            borderColor: "#fecaca",
            marginTop: 2,
            marginBottom: 12,
          },
        ]}
        onPress={logout}
        activeOpacity={0.75}
      >
        <Text
          style={{
            color: colors.danger,
            fontWeight: "900",
          }}
        >
          Logout
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
