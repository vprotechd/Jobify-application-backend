import { useTheme } from "../context/ThemeContext";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import api, { apiError } from "../services/api";
import downloadResumeFile from "../services/downloadResume";
import { Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";

export default function ViewApplication({ route, navigation }) {const { mode: __themeMode } = useTheme();
  const [application, setApplication] = useState(route.params?.application || null);
  const [loading, setLoading] = useState(!application);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!application) {
      (async () => {
        try {
          const response = await api.get(`/applications/recruiter/applications/${route.params.id}`);
          setApplication(response.data.application || response.data.data);
        } catch (error) {
          Alert.alert("Application", apiError(error));
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const downloadResume = async () => {
    setDownloading(true);
    try {
      await downloadResumeFile(
        `/applications/recruiter/applications/${application._id}/resume/download`,
        `${application.candidate?.name || "candidate"}-resume.pdf`
      );

      // The CV is now unlocked for this recruiter - reload the application so
      // the candidate's email, phone and other contact details appear.
      try {
        const refreshed = await api.get(`/applications/recruiter/applications/${application._id}`);
        const fresh = refreshed.data.application || refreshed.data.data;
        if (fresh) setApplication(fresh);
      } catch {
        // Download already succeeded; keep the current details on screen.
      }

      Alert.alert("Resume", "Resume access granted and download started.");
    } catch (error) {
      Alert.alert("Resume", apiError(error, "Unable to access resume."));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Loader />;
  if (!application) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header
        eyebrow="Recruiter"
        title={application.job?.title || "Application"}
        subtitle={application.candidate?.name || "Candidate"}
      />
      <View style={styles.card}>
        {[
          ["Candidate", application.candidate?.name],
          ["Email", application.candidate?.email],
          ["Phone", application.candidate?.phone],
          ["Status", application.status],
          ["Applied", application.createdAt ? new Date(application.createdAt).toLocaleString() : ""],
        ].map(([label, value]) => (
          <View key={label} style={[styles.row, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={styles.muted}>{label}</Text>
            <Text style={{ fontWeight: "700", maxWidth: "60%", textAlign: "right" }}>{value || "-"}</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={{ fontSize: 19, fontWeight: "800" }}>Cover Letter</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: colors.muted }}>{application.coverLetter || "No cover letter provided."}</Text>
      </View>
      <TouchableOpacity style={[styles.button, downloading && { opacity: 0.6 }]} disabled={downloading} onPress={downloadResume}>
        <Text style={styles.buttonText}>{downloading ? "Accessing Resume..." : "Access Candidate Resume"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
