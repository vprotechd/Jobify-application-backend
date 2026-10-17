
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useTheme } from "../context/ThemeContext";
import api, { apiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { styles, Header, Loader } from "../components/common";
import { colors } from "../theme/theme";

export default function CandidateDashboard({ navigation }) {
  const { mode: __themeMode } = useTheme();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setError("");

      const response = await api.get(
        `/profile/me?_=${Date.now()}`
      );

      setProfile(response.data?.profile || null);
    } catch (err) {
      setError(apiError(err) || "Unable to load your profile.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const actionCards = [
    {
      title: "Applications",
      screen: "Applications",
      description: "Track your job applications",
    },
    {
      title: "Saved Jobs",
      screen: "Favorites",
      description: "View your favorite jobs",
    },
  ];

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Header
        title={`Welcome, ${
          profile?.name || user?.name || "Jobseeker"
        }`}
        subtitle="Your career dashboard"
      />

      {!!error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            onPress={loadProfile}
            activeOpacity={0.8}
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <Loader />
      ) : (
        <>
          {/* Profile card */}
          <View style={styles.card}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: colors.text,
              }}
            >
              {profile?.headline || "Build your professional profile"}
            </Text>

            <Text style={[styles.muted, { marginTop: 8 }]}>
              {profile?.location || "Add your location"}
              {profile?.email ? ` • ${profile.email}` : ""}
            </Text>

            <TouchableOpacity
              style={[styles.outline, { marginTop: 14 }]}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <Text style={styles.outlineText}>Edit profile</Text>
            </TouchableOpacity>
          </View>

          {/* Quick navigation */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 4,
            }}
          >
            {actionCards.map((item) => (
              <TouchableOpacity
                key={item.title}
                style={[
                  styles.card,
                  {
                    flex: 1,
                    marginBottom: 0,
                  },
                ]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "900",
                    color: colors.primary,
                  }}
                >
                  →
                </Text>

                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.text,
                    marginTop: 8,
                  }}
                >
                  {item.title}
                </Text>

                <Text style={[styles.muted, { marginTop: 4 }]}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Find jobs */}
          <TouchableOpacity
            style={[styles.button, { marginTop: 18 }]}
            onPress={() => navigation.navigate("Jobs")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Find jobs</Text>
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity
            style={[styles.outline, { marginTop: 12 }]}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.outlineText}>Sign out</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
