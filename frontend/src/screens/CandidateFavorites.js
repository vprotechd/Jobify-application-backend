
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useTheme } from "../context/ThemeContext";
import api, { apiError } from "../services/api";
import {
  Empty,
  Header,
  Loader,
  styles,
} from "../components/common";
import { colors } from "../theme/theme";

export default function CandidateFavorites({ navigation }) {
  const { mode: __themeMode } = useTheme();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFavorites = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/favorites");
      setJobs(response.data?.favorites || []);
    } catch (err) {
      setError(apiError(err) || "Unable to load saved jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const removeFavorite = async (id) => {
    if (!id) return;

    try {
      setError("");

      await api.delete(`/favorites/${id}`);

      setJobs((currentJobs) =>
        currentJobs.filter(
          (job) => String(job._id || job.id) !== String(id)
        )
      );
    } catch (err) {
      setError(apiError(err) || "Unable to remove this saved job.");
    }
  };

  const openJob = (job) => {
    navigation.navigate("JobDetails", {
      id: job._id || job.id,
      job,
    });
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
        title="Saved Jobs"
        subtitle="Jobs you saved for later."
      />

      {!!error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            onPress={loadFavorites}
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
      ) : jobs.length === 0 ? (
        <>
          <Empty text="No saved jobs. Save interesting jobs from the job listing." />

          <TouchableOpacity
            style={[styles.button, { marginTop: 16 }]}
            onPress={() => navigation.navigate("Jobs")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Find Jobs</Text>
          </TouchableOpacity>
        </>
      ) : (
        jobs.map((job) => {
          const jobId = job._id || job.id;

          return (
            <View
              style={styles.card}
              key={String(jobId)}
            >
              <TouchableOpacity
                onPress={() => openJob(job)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                  }}
                >
                  {job.title || "Untitled Job"}
                </Text>

                <Text
                  style={{
                    marginTop: 5,
                    color: colors.primary,
                    fontWeight: "700",
                  }}
                >
                  {job.company?.name || "Company"}
                </Text>

                <Text
                  style={[styles.muted, { marginTop: 7 }]}
                >
                  {"📍 "}
                  {job.location || "Location not specified"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outline,
                  {
                    marginTop: 12,
                    borderColor: "#fecaca",
                  },
                ]}
                onPress={() => removeFavorite(jobId)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: colors.danger,
                    fontWeight: "800",
                  }}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
