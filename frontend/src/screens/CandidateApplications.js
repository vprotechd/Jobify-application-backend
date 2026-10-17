
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useTheme } from "../context/ThemeContext";
import api, { apiError } from "../services/api";
import {
  styles,
  Header,
  Loader,
  Empty,
} from "../components/common";
import { colors } from "../theme/theme";

export default function CandidateApplications({ navigation }) {
  const { mode: __themeMode } = useTheme();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadApplications = useCallback(async () => {
    try {
      setError("");

      const response = await api.get(
        "/applications/candidate/applications"
      );

      const data = response.data;

      setApplications(
        data.applications || data.data || []
      );
    } catch (err) {
      setError(
        apiError(err) || "Unable to load your applications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [loadApplications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadApplications();
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
        title="My applications"
        subtitle="Track every application you have submitted."
      />

      {!!error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            onPress={loadApplications}
            style={{ marginTop: 8 }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: colors.primary,
                fontWeight: "700",
              }}
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <Loader />
      ) : applications.length > 0 ? (
        applications.map((application) => {
          const job = application.job;
          const company =
            application.company?.name ||
            job?.company?.name ||
            "Company";

          return (
            <View
              style={styles.card}
              key={application._id}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: colors.text,
                }}
              >
                {job?.title ||
                  application.jobTitle ||
                  "Job application"}
              </Text>

              <Text style={[styles.muted, { marginTop: 5 }]}>
                {company}
              </Text>

              <Text
                style={{
                  marginTop: 10,
                  color: colors.primary,
                  fontWeight: "700",
                  textTransform: "capitalize",
                }}
              >
                Status: {application.status || "Pending"}
              </Text>

              <TouchableOpacity
                style={[
                  styles.outline,
                  { marginTop: 14 },
                ]}
                onPress={() =>
                  navigation.navigate("Messages", {
                    applicationId: application._id,
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.outlineText}>
                  Message Recruiter
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      ) : (
        <Empty text="You haven't applied to any jobs yet." />
      )}
    </ScrollView>
  );
}
