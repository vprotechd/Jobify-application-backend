
import { useTheme } from "../context/ThemeContext";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";
import {
  Header,
  Loader,
  styles,
} from "../components/common";
import { colors } from "../theme/theme";

export default function CompanyDetails({ route, navigation }) {
  const { mode: __themeMode } = useTheme();

  const [company, setCompany] = useState(
    route.params?.company || null
  );
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(!company);

  useEffect(() => {
    let mounted = true;

    const fetchCompanyDetails = async () => {
      try {
        const response = await api.get(
          `/companies/${route.params.id}`
        );

        if (mounted) {
          setCompany(
            response.data.company || response.data.data
          );
          setJobs(response.data.jobs || []);
        }
      } catch (error) {
        // Keep the screen usable if the request fails.
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCompanyDetails();

    return () => {
      mounted = false;
    };
  }, [route.params.id]);

  if (loading) {
    return <Loader />;
  }

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
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        style={{
          alignSelf: "flex-start",
          paddingVertical: 8,
          paddingRight: 16,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: colors.primary,
            fontWeight: "800",
            fontSize: 16,
          }}
        >
          ‹ Back
        </Text>
      </TouchableOpacity>

      <Header
        eyebrow="Company"
        title={company?.name || "Company"}
        subtitle={`${company?.industry || ""}${
          company?.location ? ` • ${company.location}` : ""
        }`}
      />

      <View style={styles.card}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: colors.text,
          }}
        >
          About Company
        </Text>

        <Text
          style={{
            marginTop: 12,
            lineHeight: 24,
            color: colors.muted,
          }}
        >
          {company?.description ||
            company?.about ||
            "No company description available."}
        </Text>

        {company?.website ? (
          <Text
            style={{
              marginTop: 14,
              color: colors.primary,
              fontWeight: "700",
            }}
          >
            Website: {company.website}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: colors.text,
          }}
        >
          Open Positions
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontWeight: "700",
          }}
        >
          {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
        </Text>
      </View>

      {jobs.length > 0 ? (
        jobs.map((job) => (
          <TouchableOpacity
            key={job._id}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate("JobDetails", {
                id: job._id,
                job,
              })
            }
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: colors.text,
              }}
            >
              {job.title || "Untitled Position"}
            </Text>

            <Text
              style={[
                styles.muted,
                { marginTop: 7 },
              ]}
            >
              {job.location || "Remote"} •{" "}
              {job.jobType || "Full-time"}
            </Text>

            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: colors.primary + "18",
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                View Job Details →
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.card}>
          <Text
            style={{
              color: colors.muted,
              lineHeight: 22,
            }}
          >
            No active jobs at this company.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
