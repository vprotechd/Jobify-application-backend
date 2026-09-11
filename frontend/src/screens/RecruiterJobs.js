import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api, { apiError } from "../services/api";
import { Empty, Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";

export default function RecruiterJobs({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const response = await api.get("/recruiter/jobs");
      setJobs(response.data.jobs || []);
    } catch (error) {
      Alert.alert("Jobs", apiError(error, "Unable to load your jobs."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const deleteJob = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/recruiter/jobs/${deleteId}`);
      setJobs((currentJobs) => currentJobs.filter((job) => job._id !== deleteId));
      setDeleteId(null);
      await load();
    } catch (error) {
      Alert.alert("Delete", apiError(error, "Unable to delete this job."));
    } finally {
      setDeleting(false);
    }
  };

  const updateJob = async (id, action) => {
    try {
      await api.patch(`/recruiter/jobs/${id}/${action}`);
      await load();
    } catch (error) {
      Alert.alert("Job", apiError(error, "Unable to update job."));
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <Header title="Manage jobs" subtitle="Create, publish and manage your job listings." />
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("PostJob")}>
        <Text style={styles.buttonText}>+ Post New Job</Text>
      </TouchableOpacity>

      {deleteId && (
        <View style={[styles.card, { borderColor: "#fecaca", borderWidth: 1 }]}>
          <Text style={{ fontWeight: "800", color: colors.text }}>Delete this job?</Text>
          <Text style={[styles.muted, { marginTop: 5 }]}>This action cannot be undone.</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={[styles.outline, { marginBottom: 0 }]} onPress={() => setDeleteId(null)} disabled={deleting}>
              <Text style={styles.outlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.outline, { marginBottom: 0, borderColor: "#fecaca" }]} onPress={deleteJob} disabled={deleting}>
              <Text style={{ color: colors.danger, fontWeight: "800" }}>{deleting ? "Deleting..." : "Confirm delete"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? <Loader /> : !jobs.length ? <Empty text="No jobs posted yet." /> : jobs.map((job) => (
        <View style={styles.card} key={job._id}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{job.title}</Text>
          <Text style={[styles.muted, { marginTop: 5 }]}>
            {job.company?.name || "Company"} - {job.location || "Remote"}
          </Text>
          <Text style={{
            marginTop: 7,
            color: job.status === "closed" ? colors.danger : colors.success,
            fontWeight: "800",
            textTransform: "capitalize",
          }}>
            {job.status || "active"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.outline, { marginBottom: 0 }]}
              onPress={() => navigation.navigate("JobDetails", { id: job._id, job })}
            >
              <Text style={styles.outlineText}>View</Text>
            </TouchableOpacity>
            {job.status !== "closed" && (
              <TouchableOpacity style={[styles.outline, { marginBottom: 0 }]} onPress={() => updateJob(job._id, "close")}>
                <Text style={styles.outlineText}>Close</Text>
              </TouchableOpacity>
            )}
            {job.status !== "active" && (
              <TouchableOpacity style={[styles.outline, { marginBottom: 0 }]} onPress={() => updateJob(job._id, "publish")}>
                <Text style={styles.outlineText}>Publish</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.outline, { marginBottom: 0, borderColor: "#fecaca" }]}
              onPress={() => setDeleteId(job._id)}
            >
              <Text style={{ color: colors.danger, fontWeight: "800" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
