import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import api, { apiError } from "../services/api";
import { Empty, Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";
import { toast } from "../services/toast";

const configs = {
  users: { title: "Users", key: "users", endpoint: "/admin/users" },
  recruiters: { title: "Recruiters", key: "recruiters", endpoint: "/admin/recruiters" },
  jobs: { title: "Jobs", key: "jobs", endpoint: "/admin/jobs" },
  applications: { title: "Applications", key: "applications", endpoint: "/admin/applications" },
  companies: { title: "Companies", key: "companies", endpoint: "/admin/companies" },
};

const statusColors = { active: colors.success, open: colors.primary, pending: "#b45309", reviewing: "#b45309", accepted: colors.success, rejected: colors.danger, closed: colors.muted, draft: colors.muted };

export default function AdminResource({ resource = "users", title }) {
  const navigation = useNavigation();
  const cfg = configs[resource] || configs.users;
  const [data, setData] = useState([]), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get(cfg.endpoint);
      setData(response.data?.[cfg.key] || []);
    } catch (error) {
      toast.error(apiError(error, `Unable to load ${cfg.title.toLowerCase()}.`));
    } finally { setLoading(false); setRefreshing(false); }
  }, [cfg.endpoint, cfg.key]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const update = async (id, endpoint, body, message) => {
    try { await api.patch(`${endpoint}/${id}`, body); await load(); if (message) toast.success(message); }
    catch (error) { toast.error(apiError(error, "Unable to update record.")); }
  };

  const confirmDeleteJob = (job) => Alert.alert("Delete job", `Delete ${job.title || "this job"} and its applications?`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      try { await api.delete(`/admin/jobs/${job._id}`); await load(); toast.success("Job deleted successfully."); }
      catch (error) { toast.error(apiError(error, "Unable to delete job.")); }
    } },
  ]);

  const renderUser = x => <>
    <Text style={styles.itemTitle}>{x.name || "Unnamed user"}</Text>
    <Text style={styles.muted}>{x.email}</Text>
    <View style={styles.metaRow}><Text style={styles.meta}>Role: {x.role}</Text><Text style={[styles.meta, { color: x.isVerified ? colors.success : colors.warning }]}>{x.isVerified ? "Verified" : "Unverified"}</Text></View>
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.smallButton} onPress={() => update(x._id, "/admin/users", { isActive: x.isActive === false }, x.isActive === false ? "User activated." : "User deactivated.")}><Text style={styles.smallButtonText}>{x.isActive === false ? "Activate" : "Deactivate"}</Text></TouchableOpacity>
      {!x.isVerified && <TouchableOpacity style={styles.smallButton} onPress={() => update(x._id, "/admin/users", { isVerified: true }, "User verified successfully.")}><Text style={styles.smallButtonText}>Verify</Text></TouchableOpacity>}
    </View>
  </>;
  const renderJob = x => <>
    <Text style={styles.itemTitle}>{x.title || "Untitled job"}</Text><Text style={styles.muted}>{x.company?.name || x.company || "Company not specified"}</Text>
    <View style={styles.metaRow}><Text style={styles.meta}>{x.location || "Location not set"}</Text><Text style={[styles.meta, { color: statusColors[x.status] || colors.text }]}>{x.status || "draft"}</Text></View>
    <Text style={styles.meta}>Recruiter: {x.recruiter?.name || x.recruiter?.email || "—"}</Text>
    <View style={styles.actionRow}>{["draft", "active", "closed"].map(s => <TouchableOpacity key={s} style={[styles.smallButton, x.status === s && { borderColor: colors.primary, backgroundColor: "#eff6ff" }]} onPress={() => update(x._id, "/admin/jobs", { status: s })}><Text style={styles.smallButtonText}>{s}</Text></TouchableOpacity>)}<TouchableOpacity style={[styles.smallButton, { borderColor: "#fecaca" }]} onPress={() => confirmDeleteJob(x)}><Text style={{ color: colors.danger, fontWeight: "800" }}>Delete</Text></TouchableOpacity></View>
  </>;
  const renderApplication = x => <>
    <Text style={styles.itemTitle}>{x.job?.title || "Application"}</Text><Text style={styles.muted}>{x.candidate?.name || x.candidate?.email || "Candidate"}</Text><Text style={styles.meta}>Recruiter: {x.recruiter?.name || "—"}</Text>
    <View style={styles.actionRow}>{["pending", "reviewing", "shortlisted", "interview", "accepted", "rejected"].map(s => <TouchableOpacity key={s} style={[styles.smallButton, x.status === s && { backgroundColor: "#eff6ff", borderColor: colors.primary }]} onPress={() => update(x._id, "/admin/applications", { status: s })}><Text style={styles.smallButtonText}>{s}</Text></TouchableOpacity>)}</View>
  </>;
  const renderCompany = x => <>
    <Text style={styles.itemTitle}>{x.name || "Company"}</Text><Text style={styles.muted}>{x.industry || x.location || "Company profile"}</Text><Text style={styles.meta}>Recruiter: {x.recruiter?.name || x.recruiter?.email || "—"}</Text>
    <View style={styles.actionRow}><TouchableOpacity style={styles.smallButton} onPress={() => update(x._id, "/admin/companies", { isActive: x.isActive === false }, x.isActive === false ? "Company activated." : "Company deactivated.")}><Text style={styles.smallButtonText}>{x.isActive === false ? "Activate" : "Deactivate"}</Text></TouchableOpacity><TouchableOpacity style={styles.smallButton} onPress={() => update(x._id, "/admin/companies", { isVerified: x.isVerified !== true }, x.isVerified ? "Company verification removed." : "Company verified successfully.")}><Text style={styles.smallButtonText}>{x.isVerified ? "Unverify" : "Verify"}</Text></TouchableOpacity></View>
  </>;
  const renderRecruiter = x => renderUser(x);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
    <Header eyebrow="Jobify Admin" title={title || cfg.title} subtitle={`Manage ${cfg.title.toLowerCase()} from one place.`} />
    {loading ? <Loader /> : !data.length ? <Empty text={`No ${cfg.title.toLowerCase()} found.`} /> : data.map((x, i) => <View key={x._id || i} style={styles.card}>{resource === "users" ? renderUser(x) : resource === "recruiters" ? renderRecruiter(x) : resource === "jobs" ? renderJob(x) : resource === "applications" ? renderApplication(x) : renderCompany(x)}</View>)}
  </ScrollView>;
}
