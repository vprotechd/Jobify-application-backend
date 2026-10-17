
import { useTheme } from "../context/ThemeContext";
import React, { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api, { apiError } from "../services/api";
import {
  Empty,
  Header,
  Loader,
  styles,
} from "../components/common";
import { colors } from "../theme/theme";

const statuses = [
  "pending",
  "reviewing",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
];

export default function RecruiterApplications({ navigation }) {
  const { mode: __themeMode } = useTheme();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async () => {
    try {
      const response = await api.get(
        "/applications/recruiter/applications"
      );

      setApplications(response.data.applications || []);
    } catch (error) {
      Alert.alert(
        "Applications",
        apiError(error, "Unable to load applications.")
      );
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const update = async (id, status) => {
    try {
      await api.patch(
        `/applications/recruiter/applications/${id}/status`,
        { status }
      );

      setApplications((current) =>
        current.map((application) =>
          application._id === id
            ? { ...application, status }
            : application
        )
      );
    } catch (error) {
      Alert.alert(
        "Status",
        apiError(error, "Unable to update status.")
      );
    }
  };

  const onRefresh = () => {
    setRefresh(true);
    load();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: 40,
          paddingBottom: 30,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refresh}
          onRefresh={onRefresh}
        />
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Header
        title="Applications"
        subtitle="Review applicants and update your hiring pipeline."
      />

      {loading ? (
        <Loader />
      ) : !applications.length ? (
        <Empty text="No applications yet." />
      ) : (
        applications.map((application) => (
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
              {application.candidate?.name || "Candidate"}
            </Text>

            <Text
              style={[
                styles.muted,
                { marginTop: 4 },
              ]}
            >
              {application.job?.title || "Job"} •{" "}
              {application.candidate?.email || ""}
            </Text>

            <Text
              style={{
                marginTop: 8,
                color: colors.primary,
                fontWeight: "800",
                textTransform: "capitalize",
              }}
            >
              {application.status || "pending"}
            </Text>

            <TouchableOpacity
              style={[
                styles.outline,
                { marginTop: 10 },
              ]}
              onPress={() =>
                navigation.navigate("ViewApplication", {
                  id: application._id,
                  application,
                })
              }
            >
              <Text style={styles.outlineText}>
                View Application
              </Text>
            </TouchableOpacity>

            {application.cvUnlocked ? (
              <TouchableOpacity
                style={styles.outline}
                onPress={() =>
                  navigation.navigate("Messages", {
                    applicationId: application._id,
                  })
                }
              >
                <Text style={styles.outlineText}>
                  Message Candidate
                </Text>
              </TouchableOpacity>
            ) : (
              <Text
                style={[
                  styles.muted,
                  { marginTop: 6 },
                ]}
              >
                Unlock CV to message this candidate
              </Text>
            )}

            <Text style={styles.label}>
              Update status
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 7,
              }}
            >
              {statuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() =>
                    update(application._id, status)
                  }
                  style={[
                    styles.chip,
                    {
                      borderWidth: 1,
                      borderColor:
                        application.status === status
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { textTransform: "capitalize" },
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
