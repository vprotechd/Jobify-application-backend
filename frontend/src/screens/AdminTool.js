import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api, { apiError } from "../services/api";
import { Field, Header, Loader, Empty, styles } from "../components/common";
import { colors } from "../theme/theme";
import { toast } from "../services/toast";

const titles = { packages: "CV Packages", payments: "Payments", pricing: "Pricing", commission: "Commission", analytics: "Analytics", reports: "Reports", features: "Features", settings: "Settings", enquiries: "Contact Enquiries" };
const statuses = ["open", "reviewing", "resolved", "dismissed"];

function Stat({ label, value }) { return <View style={[styles.card, { flex: 1, minWidth: 140, marginBottom: 0 }]}><Text style={{ fontSize: 25, fontWeight: "900", color: colors.primary }}>{value}</Text><Text style={[styles.muted, { marginTop: 4 }]}>{label}</Text></View>; }
function Toggle({ label, value, onPress }) { return <TouchableOpacity style={[styles.outline, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]} onPress={onPress}><Text style={styles.outlineText}>{label}</Text><Text style={{ fontWeight: "900", color: value ? colors.success : colors.muted }}>{value ? "ON" : "OFF"}</Text></TouchableOpacity>; }

export default function AdminTool({ route }) {
  const r = route.params?.resource || "settings";
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [busy, setBusy] = useState(false);
  const [pkg, setPkg] = useState({ name: "", description: "", price: "", credits: "", currency: "INR", sortOrder: "0" });
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      let endpoint = `/admin/${r}`;
      if (r === "pricing" || r === "settings" || r === "features") endpoint = "/admin/settings";
      if (r === "enquiries") endpoint = "/contact/admin";
      if (r === "commission") {
        const [commissionResponse, settingsResponse] = await Promise.all([api.get("/admin/commission"), api.get("/admin/settings")]);
        setData({ ...(commissionResponse.data?.commission || {}), ...(settingsResponse.data?.settings || {}) });
      } else {
        const response = await api.get(endpoint);
        setData(response.data?.settings || response.data?.packages || response.data?.payments || response.data?.reports || response.data?.analytics || response.data?.commission || response.data?.features || response.data?.enquiries || response.data);
      }
    } catch (error) { toast.error(apiError(error, `Unable to load ${titles[r] || "admin data"}.`)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [r]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveSettings = async () => {
    if (!data) return;
    setBusy(true);
    try { await api.put("/admin/settings", data); await load(); }
    catch (error) { toast.error(apiError(error, "Unable to save settings.")); }
    finally { setBusy(false); }
  };

  const createOrUpdatePackage = async () => {
    if (!pkg.name.trim() || Number(pkg.credits) <= 0 || Number(pkg.price) < 0) return toast.error("Enter a package name, positive credits and a valid price.");
    setBusy(true);
    try {
      const body = { ...pkg, credits: Number(pkg.credits), price: Number(pkg.price), sortOrder: Number(pkg.sortOrder) || 0, active: true };
      if (editingId) await api.patch(`/admin/packages/${editingId}`, body); else await api.post("/admin/packages", body);
      setPkg({ name: "", description: "", price: "", credits: "", currency: "INR", sortOrder: "0" }); setEditingId(null); await load();
    } catch (error) { toast.error(apiError(error, "Unable to save package.")); }
    finally { setBusy(false); }
  };
  const editPackage = x => { setEditingId(x._id); setPkg({ name: x.name || "", description: x.description || "", price: String(x.price ?? ""), credits: String(x.credits ?? ""), currency: x.currency || "INR", sortOrder: String(x.sortOrder ?? 0) }); };
  const deletePackage = id => Alert.alert("Delete package", "This package will be removed from recruiter pricing.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { try { await api.delete(`/admin/packages/${id}`); await load(); toast.success("CV package deleted successfully."); } catch (error) { toast.error(apiError(error)); } } }]);
  const setReport = async (id, status) => { try { await api.patch(`/admin/reports/${id}`, { status }); await load(); } catch (error) { toast.error(apiError(error)); } };
  const setEnquiry = async (id, status) => { try { await api.patch(`/contact/admin/${id}`, { status }); await load(); } catch (error) { toast.error(apiError(error)); } };

  if (loading) return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><Header eyebrow="Administrator" title={titles[r] || "Admin"} /><Loader /></ScrollView>;

  const settingsData = data || {};
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
    <Header eyebrow="Jobify Admin" title={titles[r] || "Admin Tool"} subtitle="Complete platform administration with live data and actionable controls." />

    {r === "packages" && <>
      <View style={styles.card}><Text style={{ fontSize: 19, fontWeight: "900", marginBottom: 12 }}>{editingId ? "Edit CV Package" : "Create CV Package"}</Text><Field label="Package name" value={pkg.name} onChangeText={v => setPkg(x => ({ ...x, name: v }))} placeholder="Starter / Professional" /><Field label="Description" value={pkg.description} onChangeText={v => setPkg(x => ({ ...x, description: v }))} placeholder="Candidate CV access credits" multiline /><View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Field label="Price (₹)" value={pkg.price} onChangeText={v => setPkg(x => ({ ...x, price: v }))} keyboardType="numeric" /></View><View style={{ flex: 1 }}><Field label="Credits" value={pkg.credits} onChangeText={v => setPkg(x => ({ ...x, credits: v }))} keyboardType="numeric" /></View></View><TouchableOpacity style={styles.button} onPress={createOrUpdatePackage} disabled={busy}><Text style={styles.buttonText}>{busy ? "Saving..." : editingId ? "Update Package" : "Create Package"}</Text></TouchableOpacity>{editingId && <TouchableOpacity style={styles.outline} onPress={() => { setEditingId(null); setPkg({ name: "", description: "", price: "", credits: "", currency: "INR", sortOrder: "0" }); }}><Text style={styles.outlineText}>Cancel edit</Text></TouchableOpacity>}</View>
      {(data || []).map(x => <View style={styles.card} key={x._id}><View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.itemTitle}>{x.name}</Text><Text style={styles.muted}>{x.credits} credits • ₹{x.price} • {x.active ? "Active" : "Inactive"}</Text></View></View><Text style={[styles.muted, { marginTop: 7 }]}>{x.description || "No description"}</Text><View style={styles.actionRow}><TouchableOpacity style={styles.smallButton} onPress={() => editPackage(x)}><Text style={styles.smallButtonText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.smallButton} onPress={async () => { try { await api.patch(`/admin/packages/${x._id}`, { active: !x.active }); await load(); } catch (e) { toast.error(apiError(e)); } }}><Text style={styles.smallButtonText}>{x.active ? "Disable" : "Enable"}</Text></TouchableOpacity><TouchableOpacity style={[styles.smallButton, { borderColor: "#fecaca" }]} onPress={() => deletePackage(x._id)}><Text style={{ color: colors.danger, fontWeight: "800" }}>Delete</Text></TouchableOpacity></View></View>)}
      {!(data || []).length && <Empty text="No CV packages configured." />}
    </>}

    {(r === "settings" || r === "pricing" || r === "features") && <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}><Stat label="Free CV credits" value={settingsData.freeCvCreditsPerMonth ?? 10} /><Stat label="Credit cost" value={settingsData.creditCostPerCandidate ?? 1} /><Stat label="Commission" value={`${settingsData.commissionPercent ?? 0}%`} /></View>
      <View style={styles.card}>
        <Text style={{ fontSize: 19, fontWeight: "900", marginBottom: 12 }}>Pricing & platform configuration</Text>
        <Field label="Free CV credits / month" value={String(settingsData.freeCvCreditsPerMonth ?? 10)} onChangeText={v => setData(x => ({ ...x, freeCvCreditsPerMonth: Number(v) }))} keyboardType="numeric" />
        <Field label="CV credit cost per candidate" value={String(settingsData.creditCostPerCandidate ?? 1)} onChangeText={v => setData(x => ({ ...x, creditCostPerCandidate: Number(v) }))} keyboardType="numeric" />
        <Field label="Commission percentage" value={String(settingsData.commissionPercent ?? 0)} onChangeText={v => setData(x => ({ ...x, commissionPercent: Number(v) }))} keyboardType="numeric" />
        <Field label="Currency" value={settingsData.currency || "INR"} onChangeText={v => setData(x => ({ ...x, currency: v }))} />
        <Field label="Platform name" value={settingsData.platformName || "Jobify"} onChangeText={v => setData(x => ({ ...x, platformName: v }))} />
        <Field label="Contact email" value={settingsData.contactEmail || ""} onChangeText={v => setData(x => ({ ...x, contactEmail: v }))} keyboardType="email-address" />
        <Field label="Support phone" value={settingsData.supportPhone || ""} onChangeText={v => setData(x => ({ ...x, supportPhone: v }))} />
        <Toggle label="Maintenance mode" value={!!settingsData.maintenanceMode} onPress={() => setData(x => ({ ...x, maintenanceMode: !x.maintenanceMode }))} />
        <Toggle label="Candidate search" value={settingsData.allowCandidateSearch !== false} onPress={() => setData(x => ({ ...x, allowCandidateSearch: !x.allowCandidateSearch }))} />
        <Toggle label="Candidate contact" value={settingsData.allowCandidateContact !== false} onPress={() => setData(x => ({ ...x, allowCandidateContact: !x.allowCandidateContact }))} />
        <Toggle label="CV search" value={settingsData.features?.cvSearch !== false} onPress={() => setData(x => ({ ...x, features: { ...x.features, cvSearch: !x.features?.cvSearch } }))} />
        <Toggle label="CV download" value={settingsData.features?.cvDownload !== false} onPress={() => setData(x => ({ ...x, features: { ...x.features, cvDownload: !x.features?.cvDownload } }))} />
        <Toggle label="Recruiter contact" value={settingsData.features?.recruiterContact !== false} onPress={() => setData(x => ({ ...x, features: { ...x.features, recruiterContact: !x.features?.recruiterContact } }))} />
        <Toggle label="Payments" value={settingsData.features?.payments !== false} onPress={() => setData(x => ({ ...x, features: { ...x.features, payments: !x.features?.payments } }))} />
        <TouchableOpacity style={styles.button} onPress={saveSettings} disabled={busy}><Text style={styles.buttonText}>{busy ? "Saving..." : "Save Configuration"}</Text></TouchableOpacity>
      </View>
    </>}

    {r === "payments" && <>
      <View style={styles.card}><Text style={{ fontSize: 19, fontWeight: "900" }}>Payment history</Text><Text style={styles.muted}>All recruiter CV-credit transactions.</Text></View>
      {(data || []).map(x => <View style={styles.card} key={x._id}><Text style={styles.itemTitle}>{x.package?.name || "CV Package"}</Text><Text style={styles.muted}>{x.recruiter?.name || x.recruiter?.email || "Recruiter"}</Text><View style={styles.metaRow}><Text style={styles.meta}>₹{x.amount} • {x.credits} credits</Text><Text style={{ fontWeight: "900", color: x.status === "paid" ? colors.success : x.status === "failed" ? colors.danger : colors.warning }}>{String(x.status || "created").toUpperCase()}</Text></View><Text style={styles.meta}>{x.razorpayPaymentId || x.razorpayOrderId || "No Razorpay ID"}</Text></View>)}{!(data || []).length && <Empty text="No payments found." />}
    </>}

    {r === "analytics" && <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{[...(data?.usersByRole || [])].map(x => <Stat key={`u-${x._id}`} label={`Users: ${x._id}`} value={x.count} />)}<Stat label="Paid revenue" value={`₹${data?.revenue?.revenue || 0}`} /><Stat label="Transactions" value={data?.revenue?.transactions || 0} /><Stat label="Credits sold" value={data?.revenue?.credits || 0} /></View>
      {[['Jobs by status', data?.jobsByStatus], ['Applications by status', data?.applicationsByStatus], ['Monthly users', data?.monthlyUsers], ['Monthly payments', data?.monthlyPayments]].map(([heading, rows]) => <View style={styles.card} key={heading}><Text style={{ fontSize: 17, fontWeight: "900", marginBottom: 8 }}>{heading}</Text>{(rows || []).length ? rows.map((x, i) => <View key={i} style={[styles.row, { paddingVertical: 7, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}><Text style={styles.muted}>{x._id}</Text><Text style={{ fontWeight: "900" }}>{x.count ?? x.revenue ?? 0}</Text></View>) : <Text style={styles.muted}>No data yet.</Text>}</View>)}
    </>}

    {r === "commission" && <View style={styles.card}><Text style={{ fontSize: 19, fontWeight: "900" }}>Commission & revenue</Text><Text style={[styles.muted, { marginTop: 7 }]}>Configure the platform commission and review live payment totals.</Text><Field label="Commission percentage" value={String(data?.commissionPercent ?? 0)} onChangeText={v => setData(x => ({ ...x, commissionPercent: Number(v) }))} keyboardType="numeric" /><Text style={{ marginBottom: 7 }}>Gross revenue: <Text style={{ fontWeight: "900" }}>₹{data?.grossRevenue || 0}</Text></Text><Text style={{ marginBottom: 7 }}>Commission: <Text style={{ fontWeight: "900" }}>₹{data?.commission || 0}</Text></Text><Text style={{ marginBottom: 14 }}>Net revenue: <Text style={{ fontWeight: "900" }}>₹{data?.netRevenue || 0}</Text></Text><TouchableOpacity style={styles.button} onPress={saveSettings} disabled={busy}><Text style={styles.buttonText}>{busy ? "Saving..." : "Save Commission"}</Text></TouchableOpacity></View>}

    {r === "reports" && <>{(data || []).map(x => <View style={styles.card} key={x._id}><Text style={styles.itemTitle}>{x.reason || x.targetType || "Report"}</Text><Text style={styles.muted}>{x.description || "No description"}</Text><Text style={styles.meta}>Reported by {x.reporter?.name || x.reporter?.email || "User"}</Text><View style={styles.actionRow}>{statuses.map(s => <TouchableOpacity key={s} style={[styles.smallButton, x.status === s && { backgroundColor: "#eff6ff", borderColor: colors.primary }]} onPress={() => setReport(x._id, s)}><Text style={styles.smallButtonText}>{s}</Text></TouchableOpacity>)}</View><Field label="Admin notes" value={x.adminNotes || ""} onChangeText={v => setData(list => list.map(item => item._id === x._id ? { ...item, adminNotes: v } : item))} multiline placeholder="Internal moderation notes" /><TouchableOpacity style={styles.smallButton} onPress={async () => { try { await api.patch(`/admin/reports/${x._id}`, { adminNotes: x.adminNotes || "" }); await load(); } catch (e) { toast.error(apiError(e)); } }}><Text style={styles.smallButtonText}>Save notes</Text></TouchableOpacity></View>)}{!(data || []).length && <Empty text="No reports found." />}</>}

    {r === "enquiries" && <>{(data || []).map(x => <View style={styles.card} key={x._id}><Text style={styles.itemTitle}>{x.subject}</Text><Text style={styles.muted}>{x.name} • {x.email}</Text><Text style={{ marginTop: 8, lineHeight: 22 }}>{x.message}</Text><Text style={[styles.meta, { marginTop: 8 }]}>Status: {x.status}</Text><View style={styles.actionRow}>{["new", "in_progress", "resolved"].map(s => <TouchableOpacity key={s} style={[styles.smallButton, x.status === s && { backgroundColor: "#eff6ff", borderColor: colors.primary }]} onPress={() => setEnquiry(x._id, s)}><Text style={styles.smallButtonText}>{s}</Text></TouchableOpacity>)}</View></View>)}{!(data || []).length && <Empty text="No contact enquiries found." />}</>}
  </ScrollView>;
}
