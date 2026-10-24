
import { useTheme } from "../context/ThemeContext";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api, { apiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";
import {
  Field,
  Header,
  Loader,
  styles,
} from "../components/common";

export default function JobDetails({ route, navigation }) {
  const { mode: __themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [job, setJob] = useState(route.params?.job || null);
  const [loading, setLoading] = useState(!job);
  const [saved, setSaved] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);

  const id = route.params?.id || job?._id;

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (!job) {
          const r = await api.get(`/jobs/${id}`);

          if (active) {
            setJob(r.data.job || r.data.data);
          }
        }

        if (user?.role === "jobseeker" && id) {
          try {
            const f = await api.get("/favorites");

            if (active) {
              setSaved(
                (f.data.favorites || []).some(
                  (x) => (x._id || x.id) === id
                )
              );
            }
          } catch {
            // Preserve existing favorites error handling.
          }
        }
      } catch (e) {
        if (active) {
          Alert.alert(
            "Unable to load job",
            apiError(e, "This job is unavailable.")
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const toggleSave = async () => {
    if (!user) {
      return navigation.getParent()?.navigate("Login");
    }

    if (user.role !== "jobseeker") {
      return Alert.alert(
        "Saved jobs",
        "Only jobseekers can save jobs."
      );
    }

    try {
      const r = saved
        ? await api.delete(`/favorites/${id}`)
        : await api.post(`/favorites/${id}`);

      setSaved(Boolean(r.data.saved));
    } catch (e) {
      Alert.alert(
        "Saved jobs",
        apiError(e, "Unable to update saved jobs.")
      );
    }
  };

  const apply = async () => {
    if (!user) {
      return Alert.alert(
        "Registration required",
        "Please register first to continue.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log in",
            onPress: () => navigation.navigate("Login"),
          },
          {
            text: "Register",
            onPress: () => navigation.navigate("Register"),
          },
        ]
      );
    }

    if (user.role !== "jobseeker") {
      return Alert.alert(
        "Application",
        "Only jobseekers can apply."
      );
    }

    if (!coverLetter.trim()) {
      return Alert.alert(
        "Cover letter",
        "Please add a short cover letter."
      );
    }

    setApplying(true);

    try {
      await api.post(`/applications/jobs/${id}/apply`, {
        coverLetter: coverLetter.trim(),
      });

      Alert.alert(
        "Application submitted",
        "Your application was submitted successfully.",
        [
          {
            text: "View applications",
            onPress: () => navigation.navigate("Applications"),
          },
          { text: "Done" },
        ]
      );
    } catch (e) {
      Alert.alert(
        "Unable to apply",
        apiError(
          e,
          "Please complete your profile and resume first."
        )
      );
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!job) {
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <View
          style={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom, 20) + 20,
            },
          ]}
        >
          <Header
            title="Job not found"
            subtitle="This job may have been removed or closed."
          />

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Jobs")}
          >
            <Text style={styles.buttonText}>Browse Jobs</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const company =
    job.company?.name || job.companyName || "Company";

  const requirements = Array.isArray(job.requirements)
    ? job.requirements
    : [];

  const responsibilities = Array.isArray(job.responsibilities)
    ? job.responsibilities
    : [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back navigation */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginBottom: 18, alignSelf: "flex-start" }}
      >
        <Text
          style={{
            color: colors.muted,
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          ‹ Back
        </Text>
      </TouchableOpacity>

      {/* Job header */}
      <View style={styles.card}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 15,
              backgroundColor: colors.softPrimary,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 13,
            }}
          >
            <Text
              style={{
                fontSize: 25,
                fontWeight: "900",
                color: colors.primary,
              }}
            >
              {company.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "900",
                color: colors.text,
              }}
            >
              {job.title}
            </Text>

            <TouchableOpacity
              onPress={() =>
                job.company?._id &&
                navigation.navigate("CompanyDetails", {
                  id: job.company._id,
                  company: job.company,
                })
              }
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "800",
                  marginTop: 5,
                }}
              >
                {company}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 16,
          }}
        >
          <TouchableOpacity
            style={[styles.outline, { flex: 1 }]}
            onPress={toggleSave}
          >
            <Text style={styles.outlineText}>
              {saved ? "♥ Saved" : "♡ Save job"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outline, { flex: 1 }]}
            onPress={() =>
              Share.share({
                message: `${job.title} at ${company}${
                  job.location ? ` — ${job.location}` : ""
                }`,
              })
            }
          >
            <Text style={styles.outlineText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Role description */}
      <View style={styles.card}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: colors.text,
          }}
        >
          About this role
        </Text>

        <Text
          style={{
            marginTop: 12,
            lineHeight: 24,
            color: colors.muted,
          }}
        >
          {job.description || "No description available."}
        </Text>
      </View>

      {/* Job information */}
      <View style={styles.card}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: colors.text,
            marginBottom: 5,
          }}
        >
          Job information
        </Text>

        {[
          ["Location", job.location],
          ["Job type", job.jobType || job.type],
          [
            "Work mode",
            job.workMode || job.workplace || job.mode,
          ],
          [
            "Experience",
            job.experience || job.experienceLevel,
          ],
          [
            "Salary",
            job.salary ||
              job.salaryRange ||
              (job.salaryMin != null
                ? `₹${job.salaryMin}${
                    job.salaryMax != null
                      ? ` - ₹${job.salaryMax}`
                      : "+"
                  }`
                : ""),
          ],
          [
            "Deadline",
            job.applicationDeadline
              ? new Date(
                  job.applicationDeadline
                ).toLocaleDateString()
              : "",
          ],
        ].map(([label, value]) => (
          <View
            key={label}
            style={[
              styles.row,
              {
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={styles.muted}>{label}</Text>

            <Text
              style={{
                fontWeight: "700",
                color: colors.text,
                maxWidth: "60%",
                textAlign: "right",
              }}
            >
              {value || "Not specified"}
            </Text>
          </View>
        ))}
      </View>

      {/* Skills */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: colors.text,
          marginBottom: 10,
        }}
      >
        Skills
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {(Array.isArray(job.skills) ? job.skills : []).map(
          (skill, index) => (
            <View
              style={styles.chip}
              key={`${skill}-${index}`}
            >
              <Text style={styles.chipText}>{skill}</Text>
            </View>
          )
        )}
      </View>

      {/* Requirements */}
      {requirements.length > 0 && (
        <View style={styles.card}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: colors.text,
            }}
          >
            Requirements
          </Text>

          {requirements.map((item, index) => (
            <Text
              key={index}
              style={{
                marginTop: 9,
                color: colors.muted,
                lineHeight: 22,
              }}
            >
              {"• "}{item}
            </Text>
          ))}
        </View>
      )}

      {/* Responsibilities */}
      {responsibilities.length > 0 && (
        <View style={styles.card}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: colors.text,
            }}
          >
            Responsibilities
          </Text>

          {responsibilities.map((item, index) => (
            <Text
              key={index}
              style={{
                marginTop: 9,
                color: colors.muted,
                lineHeight: 22,
              }}
            >
              {"• "}{item}
            </Text>
          ))}
        </View>
      )}

      {/* Application form */}
      {user?.role === "jobseeker" && (
        <View style={styles.card}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: colors.text,
            }}
          >
            Apply for this job
          </Text>

          <Text
            style={[
              styles.muted,
              { marginTop: 6 },
            ]}
          >
            Your saved profile and resume will be submitted.
          </Text>

          <Field
            label="Cover letter"
            value={coverLetter}
            onChangeText={setCoverLetter}
            placeholder="Tell the recruiter why you are a good fit..."
            multiline
            maxLength={3000}
          />

          <TouchableOpacity
            style={[
              styles.button,
              { opacity: applying ? 0.7 : 1 },
            ]}
            onPress={apply}
            disabled={applying}
          >
            <Text style={styles.buttonText}>
              {applying
                ? "Submitting..."
                : "Submit Application"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
