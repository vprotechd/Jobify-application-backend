
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../context/ThemeContext";
import api, { apiError } from "../services/api";
import {
  styles,
  Header,
  Loader,
  Empty,
} from "../components/common";
import { colors } from "../theme/theme";

const types = [
  "",
  "full-time",
  "part-time",
  "contract",
  "internship",
  "freelance",
];

const modes = ["", "remote", "hybrid", "onsite"];

export default function Jobs({ navigation, route }) {
  const { mode: __themeMode } = useTheme();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(
    route.params?.keyword || ""
  );
  const [location, setLocation] = useState(
    route.params?.location || ""
  );
  const [type, setType] = useState("");
  const [mode, setMode] = useState("");

  useEffect(() => {
    setSearch(route.params?.keyword || "");
    setLocation(route.params?.location || "");
  }, [route.params?.keyword, route.params?.location]);

  const loadJobs = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/jobs");
      setJobs(response.data?.jobs || []);
    } catch (err) {
      setError(apiError(err) || "Unable to load jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const filteredJobs = jobs.filter((job) => {
    const query = search.trim().toLowerCase();
    const searchSkills = Array.isArray(job.skills)
      ? job.skills
      : [];

    const matchesSearch =
      !query ||
      job.title?.toLowerCase().includes(query) ||
      job.company?.name?.toLowerCase().includes(query) ||
      job.companyName?.toLowerCase().includes(query) ||
      searchSkills.some((skill) =>
        String(skill).toLowerCase().includes(query)
      );

    const matchesLocation =
      !location.trim() ||
      String(job.location || "")
        .toLowerCase()
        .includes(location.trim().toLowerCase());

    const jobType = String(
      job.jobType || job.type || ""
    ).toLowerCase();

    const workMode = String(
      job.workMode || job.mode || ""
    )
      .toLowerCase()
      .replace(/[-_\s]/g, "");

    const selectedMode = mode.replace(/[-_\s]/g, "");

    const matchesType = !type || jobType === type;
    const matchesMode = !mode || workMode === selectedMode;

    return (
      matchesSearch &&
      matchesLocation &&
      matchesType &&
      matchesMode
    );
  });

  const clearFilters = () => {
    setSearch("");
    setLocation("");
    setType("");
    setMode("");
  };

  const renderFilterChips = (items, selected, onSelect) =>
    items.map((item) => (
      <TouchableOpacity
        key={item || "all"}
        style={[
          styles.chip,
          {
            borderWidth: 1,
            borderColor:
              selected === item ? colors.primary : colors.border,
            marginBottom: 4,
          },
        ]}
        onPress={() => onSelect(item)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.chipText,
            selected === item
              ? { color: colors.primary, fontWeight: "700" }
              : {},
        ]}
        >
          {item
            ? item
                .split("-")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                )
                .join(" ")
            : "All"}
        </Text>
      </TouchableOpacity>
    ));

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
      keyboardShouldPersistTaps="handled"
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
        eyebrow="Job opportunities"
        title="Find your next job"
        subtitle="Search jobs posted by verified recruiters and companies."
      />

      {/* Search and filters */}
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Job title, skills or company"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
        />

        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Location"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
        />

        <Text style={styles.label}>Job type</Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 7,
            marginBottom: 12,
          }}
        >
          {renderFilterChips(types, type, setType)}
        </View>

        <Text style={styles.label}>Work mode</Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 7,
          }}
        >
          {renderFilterChips(modes, mode, setMode)}
        </View>

        {(search || location || type || mode) && (
          <TouchableOpacity
            onPress={clearFilters}
            style={[styles.outline, { marginTop: 14 }]}
            activeOpacity={0.8}
          >
            <Text style={styles.outlineText}>
              Clear filters
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* API error */}
      {!!error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            onPress={loadJobs}
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

      {/* Job results */}
      {loading ? (
        <Loader />
      ) : filteredJobs.length === 0 ? (
        <Empty text="No jobs found. Try another search or filter." />
      ) : (
        <>
          <Text
            style={[
              styles.muted,
              { marginBottom: 12, marginTop: 4 },
            ]}
          >
            {filteredJobs.length}{" "}
            {filteredJobs.length === 1 ? "job" : "jobs"} found
          </Text>

          {filteredJobs.map((job) => {
            const jobId = job._id || job.id;

            return (
              <TouchableOpacity
                style={styles.card}
                key={String(jobId)}
                onPress={() =>
                  navigation.navigate("JobDetails", {
                    id: jobId,
                    job,
                  })
                }
                activeOpacity={0.8}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
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
                      {job.company?.name ||
                        job.companyName ||
                        "Company"}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.muted,
                      textTransform: "capitalize",
                    }}
                  >
                    {job.status || "Active"}
                  </Text>
                </View>

                <Text style={[styles.muted, { marginTop: 8 }]}>
                  {"📍 "}
                  {job.location || "Remote"} {" • "}
                  {job.jobType || job.type || "Full-time"} {" • "}
                  {job.workMode || job.mode || "On-site"}
                </Text>

                {Array.isArray(job.skills) &&
                  job.skills.length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      {job.skills.slice(0, 6).map((skill, index) => (
                        <View
                          style={styles.chip}
                          key={`${String(skill)}-${index}`}
                        >
                          <Text style={styles.chipText}>
                            {String(skill)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
