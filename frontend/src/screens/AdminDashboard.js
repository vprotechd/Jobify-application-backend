
import { useTheme } from "../context/ThemeContext";
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import api, { apiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";

export default function AdminDashboard({ navigation }) {
  const { mode: __themeMode } = useTheme();
  const { user } = useAuth();

  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get("/admin/dashboard");
      setD(response.data.dashboard || response.data);
    } catch (error) {
      setD({ error: apiError(error) });
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = {
    users: d?.totalUsers ?? 0,
    recruiters: d?.totalRecruiters ?? 0,
    jobseekers: d?.totalJobseekers ?? 0,
    jobs: d?.totalJobs ?? 0,
    activeJobs: d?.activeJobs ?? 0,
    applications: d?.totalApplications ?? 0,
    revenue: d?.revenue ?? 0,
    reports: d?.openReports ?? 0,
  };

  const statCards = [
    ["Total Users", stats.users],
    ["Recruiters", stats.recruiters],
    ["Jobseekers", stats.jobseekers],
    ["Jobs", stats.jobs],
    ["Active Jobs", stats.activeJobs],
    ["Applications", stats.applications],
    ["Open Reports", stats.reports],
    ["Revenue", `₹${stats.revenue}`],
  ];

  const managementItems = [
    ["Users", "users"],
    ["Recruiters", "recruiters"],
    ["Jobs", "jobs"],
    ["Applications", "applications"],
    ["Companies", "companies"],
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
          refreshing={refresh}
          onRefresh={() => {
            setRefresh(true);
            load();
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Header
        eyebrow="Administrator"
        title={`Welcome back, ${user?.name || "Administrator"}`}
        subtitle="Manage users, recruiters, jobs, applications and platform settings across Jobify."
      />

      {d?.error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{d.error}</Text>
        </View>
      ) : null}

      {loading ? (
        <Loader />
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {statCards.map(([label, value]) => (
              <View
                key={label}
                style={[
                  styles.card,
                  {
                    width: "47%",
                    marginBottom: 0,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "900",
                    color: colors.primary,
                  }}
                >
                  {value}
                </Text>

                <Text style={[styles.muted, { marginTop: 4 }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

         
          
<TouchableOpacity
  style={[
    styles.button,
    {
      marginTop: 16,
    },
  ]}
  onPress={() => navigation.navigate("AdminMenu")}
  activeOpacity={0.8}
>
  <Text style={styles.buttonText}>
    Open all admin tools
  </Text>
</TouchableOpacity>

        </>
      )}
    </ScrollView>
  );
}
