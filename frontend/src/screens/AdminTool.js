
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
import { Field, Header, Loader, Empty, styles } from "../components/common";
import { colors } from "../theme/theme";
import { toast } from "../services/toast";

const titles = {
  packages: "CV Packages",
  payments: "Payments",
  pricing: "Pricing",
  commission: "Commission",
  analytics: "Analytics",
  reports: "Reports",
  features: "Features",
  settings: "Settings",
  enquiries: "Contact Enquiries",
};

const statuses = ["open", "reviewing", "resolved", "dismissed"];

function Stat({ label, value }) {
  return (
    <View
      style={[
        styles.card,
        {
          flex: 1,
          minWidth: 140,
          marginBottom: 0,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 25,
          fontWeight: "900",
          color: colors.primary,
        }}
      >
        {value}
      </Text>

      <Text style={[styles.muted, { marginTop: 4 }]}>
        {label}
      </Text>
    </View>
  );
}

function Toggle({ label, value, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.outline,
        {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.outlineText}>{label}</Text>

      <Text
        style={{
          fontWeight: "900",
          color: value ? colors.success : colors.muted,
        }}
      >
        {value ? "ON" : "OFF"}
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminTool({ route }) {
  const { mode: __themeMode } = useTheme();

  const resource = route.params?.resource || "settings";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [pkg, setPkg] = useState({
    name: "",
    description: "",
    price: "",
    credits: "",
    currency: "INR",
    sortOrder: "0",
  });

  const [editingId, setEditingId] = useState(null);

  const resetPackage = () => {
    setPkg({
      name: "",
      description: "",
      price: "",
      credits: "",
      currency: "INR",
      sortOrder: "0",
    });
    setEditingId(null);
  };

  const load = useCallback(async () => {
    try {
      let endpoint = `/admin/${resource}`;

      if (
        resource === "pricing" ||
        resource === "settings" ||
        resource === "features"
      ) {
        endpoint = "/admin/settings";
      }

      if (resource === "enquiries") {
        endpoint = "/contact/admin";
      }

      if (resource === "commission") {
        const [commissionResponse, settingsResponse] =
          await Promise.all([
            api.get("/admin/commission"),
            api.get("/admin/settings"),
          ]);

        setData({
          ...(commissionResponse.data?.commission || {}),
          ...(settingsResponse.data?.settings || {}),
        });
      } else {
        const response = await api.get(endpoint);
        const result = response.data;

        setData(
          result?.settings ||
            result?.packages ||
            result?.payments ||
            result?.reports ||
            result?.analytics ||
            result?.commission ||
            result?.features ||
            result?.enquiries ||
            result
        );
      }
    } catch (error) {
      toast.error(
        apiError(
          error,
          `Unable to load ${titles[resource] || "admin data"}.`
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resource]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const saveSettings = async () => {
    if (!data) return;

    setBusy(true);

    try {
      await api.put("/admin/settings", data);
      await load();
      toast.success("Configuration saved successfully.");
    } catch (error) {
      toast.error(apiError(error, "Unable to save settings."));
    } finally {
      setBusy(false);
    }
  };

  const createOrUpdatePackage = async () => {
    if (
      !pkg.name.trim() ||
      Number(pkg.credits) <= 0 ||
      pkg.price === "" ||
      !Number.isFinite(Number(pkg.price)) ||
      Number(pkg.price) < 0
    ) {
      toast.error(
        "Enter a package name, positive credits and a valid price."
      );
      return;
    }

    setBusy(true);

    try {
      const body = {
        ...pkg,
        credits: Number(pkg.credits),
        price: Number(pkg.price),
        sortOrder: Number(pkg.sortOrder) || 0,
        active: true,
      };

      if (editingId) {
        await api.patch(`/admin/packages/${editingId}`, body);
      } else {
        await api.post("/admin/packages", body);
      }

      resetPackage();
      await load();
      toast.success(
        editingId
          ? "CV package updated successfully."
          : "CV package created successfully."
      );
    } catch (error) {
      toast.error(apiError(error, "Unable to save package."));
    } finally {
      setBusy(false);
    }
  };

  const editPackage = (item) => {
    setEditingId(item._id);

    setPkg({
      name: item.name || "",
      description: item.description || "",
      price: String(item.price ?? ""),
      credits: String(item.credits ?? ""),
      currency: item.currency || "INR",
      sortOrder: String(item.sortOrder ?? 0),
    });
  };

  const deletePackage = (id) => {
    Alert.alert(
      "Delete package",
      "This package will be removed from recruiter pricing.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/admin/packages/${id}`);
              await load();
              toast.success("CV package deleted successfully.");
            } catch (error) {
              toast.error(apiError(error));
            }
          },
        },
      ]
    );
  };

  const setReport = async (id, status) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status });
      await load();
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  const setEnquiry = async (id, status) => {
    try {
      await api.patch(`/contact/admin/${id}`, { status });
      await load();
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  const updatePackageActive = async (item) => {
    try {
      await api.patch(`/admin/packages/${item._id}`, {
        active: !item.active,
      });
      await load();
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  const settingsData = data || {};

  const updateSettings = (field, value) => {
    setData((previous) => ({
      ...(previous || {}),
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 40, paddingBottom: 32 },
        ]}
      >
        <Header
          eyebrow="Administrator"
          title={titles[resource] || "Admin"}
        />
        <Loader />
      </ScrollView>
    );
  }

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
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Header
        eyebrow="Jobify Admin"
        title={titles[resource] || "Admin Tool"}
        subtitle="Complete platform administration with live data and actionable controls."
      />

      {/* CV PACKAGES */}
      {resource === "packages" && (
        <>
          <View style={styles.card}>
            <Text
              style={{
                fontSize: 19,
                fontWeight: "900",
                color: colors.text,
                marginBottom: 12,
              }}
            >
              {editingId ? "Edit CV Package" : "Create CV Package"}
            </Text>

            <Field
              label="Package name"
              value={pkg.name}
              onChangeText={(value) =>
                setPkg((previous) => ({
                  ...previous,
                  name: value,
                }))
              }
              placeholder="Starter / Professional"
            />

            <Field
              label="Description"
              value={pkg.description}
              onChangeText={(value) =>
                setPkg((previous) => ({
                  ...previous,
                  description: value,
                }))
              }
              placeholder="Candidate CV access credits"
              multiline
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Price (₹)"
                  value={pkg.price}
                  onChangeText={(value) =>
                    setPkg((previous) => ({
                      ...previous,
                      price: value,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Field
                  label="Credits"
                  value={pkg.credits}
                  onChangeText={(value) =>
                    setPkg((previous) => ({
                      ...previous,
                      credits: value,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={createOrUpdatePackage}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {busy
                  ? "Saving..."
                  : editingId
                    ? "Update Package"
                    : "Create Package"}
              </Text>
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                style={styles.outline}
                onPress={resetPackage}
                disabled={busy}
              >
                <Text style={styles.outlineText}>Cancel edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {(Array.isArray(data) ? data : []).map((item) => (
            <View
              style={[styles.card, { marginBottom: 12 }]}
              key={item._id}
            >
              <Text style={styles.itemTitle}>{item.name}</Text>

              <Text style={styles.muted}>
                {item.credits} credits • ₹{item.price} •{" "}
                {item.active ? "Active" : "Inactive"}
              </Text>

              <Text style={[styles.muted, { marginTop: 7 }]}>
                {item.description || "No description"}
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => editPackage(item)}
                >
                  <Text style={styles.smallButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => updatePackageActive(item)}
                >
                  <Text style={styles.smallButtonText}>
                    {item.active ? "Disable" : "Enable"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    { borderColor: "#fecaca" },
                  ]}
                  onPress={() => deletePackage(item._id)}
                >
                  <Text
                    style={{
                      color: colors.danger,
                      fontWeight: "800",
                    }}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {!(Array.isArray(data) ? data : []).length && (
            <Empty text="No CV packages configured." />
          )}
        </>
      )}

      {/* SETTINGS, PRICING AND FEATURES */}
      {["settings", "pricing", "features"].includes(resource) && (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <Stat
              label="Free CV credits"
              value={settingsData.freeCvCreditsPerMonth ?? 10}
            />
            <Stat
              label="Credit cost"
              value={settingsData.creditCostPerCandidate ?? 1}
            />
            <Stat
              label="Commission"
              value={`${settingsData.commissionPercent ?? 0}%`}
            />
          </View>

          <View style={styles.card}>
            <Text
              style={{
                fontSize: 19,
                fontWeight: "900",
                color: colors.text,
                marginBottom: 12,
              }}
            >
              Pricing & platform configuration
            </Text>

            <Field
              label="Free CV credits / month"
              value={String(settingsData.freeCvCreditsPerMonth ?? 10)}
              onChangeText={(value) =>
                updateSettings("freeCvCreditsPerMonth", Number(value))
              }
              keyboardType="numeric"
            />

            <Field
              label="CV credit cost per candidate"
              value={String(settingsData.creditCostPerCandidate ?? 1)}
              onChangeText={(value) =>
                updateSettings("creditCostPerCandidate", Number(value))
              }
              keyboardType="numeric"
            />

            <Field
              label="Commission percentage"
              value={String(settingsData.commissionPercent ?? 0)}
              onChangeText={(value) =>
                updateSettings("commissionPercent", Number(value))
              }
              keyboardType="numeric"
            />

            <Field
              label="Currency"
              value={settingsData.currency || "INR"}
              onChangeText={(value) => updateSettings("currency", value)}
            />

            <Field
              label="Platform name"
              value={settingsData.platformName || "Jobify"}
              onChangeText={(value) =>
                updateSettings("platformName", value)
              }
            />

            <Field
              label="Contact email"
              value={settingsData.contactEmail || ""}
              onChangeText={(value) =>
                updateSettings("contactEmail", value)
              }
              keyboardType="email-address"
            />

            <Field
              label="Support phone"
              value={settingsData.supportPhone || ""}
              onChangeText={(value) =>
                updateSettings("supportPhone", value)
              }
              keyboardType="phone-pad"
            />

            <Toggle
              label="Maintenance mode"
              value={!!settingsData.maintenanceMode}
              onPress={() =>
                updateSettings(
                  "maintenanceMode",
                  !settingsData.maintenanceMode
                )
              }
            />

            <Toggle
              label="Candidate search"
              value={settingsData.allowCandidateSearch !== false}
              onPress={() =>
                updateSettings(
                  "allowCandidateSearch",
                  settingsData.allowCandidateSearch === false
                )
              }
            />

            <Toggle
              label="Candidate contact"
              value={settingsData.allowCandidateContact !== false}
              onPress={() =>
                updateSettings(
                  "allowCandidateContact",
                  settingsData.allowCandidateContact === false
                )
              }
            />

            <Toggle
              label="CV search"
              value={settingsData.features?.cvSearch !== false}
              onPress={() =>
                setData((previous) => ({
                  ...previous,
                  features: {
                    ...previous.features,
                    cvSearch: previous.features?.cvSearch === false,
                  },
                }))
              }
            />

            <Toggle
              label="CV download"
              value={settingsData.features?.cvDownload !== false}
              onPress={() =>
                setData((previous) => ({
                  ...previous,
                  features: {
                    ...previous.features,
                    cvDownload: previous.features?.cvDownload === false,
                  },
                }))
              }
            />

            <Toggle
              label="Recruiter contact"
              value={settingsData.features?.recruiterContact !== false}
              onPress={() =>
                setData((previous) => ({
                  ...previous,
                  features: {
                    ...previous.features,
                    recruiterContact:
                      previous.features?.recruiterContact === false,
                  },
                }))
              }
            />

            <Toggle
              label="Payments"
              value={settingsData.features?.payments !== false}
              onPress={() =>
                setData((previous) => ({
                  ...previous,
                  features: {
                    ...previous.features,
                    payments: previous.features?.payments === false,
                  },
                }))
              }
            />

            <TouchableOpacity
              style={styles.button}
              onPress={saveSettings}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {busy ? "Saving..." : "Save Configuration"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* PAYMENTS */}
      {resource === "payments" && (
        <>
          <View style={styles.card}>
            <Text
              style={{
                fontSize: 19,
                fontWeight: "900",
                color: colors.text,
              }}
            >
              Payment history
            </Text>
            <Text style={[styles.muted, { marginTop: 5 }]}>
              All recruiter CV-credit transactions.
            </Text>
          </View>

          {(Array.isArray(data) ? data : []).map((item) => (
            <View
              style={[styles.card, { marginBottom: 12 }]}
              key={item._id}
            >
              <Text style={styles.itemTitle}>
                {item.package?.name || "CV Package"}
              </Text>

              <Text style={styles.muted}>
                {item.recruiter?.name ||
                  item.recruiter?.email ||
                  "Recruiter"}
              </Text>

              <View
                style={[
                  styles.metaRow,
                  { marginTop: 10, flexWrap: "wrap" },
                ]}
              >
                <Text style={styles.meta}>
                  ₹{item.amount} • {item.credits} credits
                </Text>

                <Text
                  style={{
                    fontWeight: "900",
                    color:
                      item.status === "paid"
                        ? colors.success
                        : item.status === "failed"
                          ? colors.danger
                          : colors.warning,
                  }}
                >
                  {String(item.status || "created").toUpperCase()}
                </Text>
              </View>

              <Text style={[styles.meta, { marginTop: 7 }]}>
                {item.razorpayPaymentId ||
                  item.razorpayOrderId ||
                  "No Razorpay ID"}
              </Text>
            </View>
          ))}

          {!(Array.isArray(data) ? data : []).length && (
            <Empty text="No payments found." />
          )}
        </>
      )}

      {/* ANALYTICS */}
      {resource === "analytics" && (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {(data?.usersByRole || []).map((item) => (
              <Stat
                key={`u-${item._id}`}
                label={`Users: ${item._id}`}
                value={item.count}
              />
            ))}

            <Stat
              label="Paid revenue"
              value={`₹${data?.revenue?.revenue || 0}`}
            />

            <Stat
              label="Transactions"
              value={data?.revenue?.transactions || 0}
            />

            <Stat
              label="Credits sold"
              value={data?.revenue?.credits || 0}
            />
          </View>

          {[
            ["Jobs by status", data?.jobsByStatus],
            ["Applications by status", data?.applicationsByStatus],
            ["Monthly users", data?.monthlyUsers],
            ["Monthly payments", data?.monthlyPayments],
          ].map(([heading, rows]) => (
            <View
              style={[styles.card, { marginBottom: 12 }]}
              key={heading}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "900",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                {heading}
              </Text>

              {(rows || []).length ? (
                rows.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.row,
                      {
                        paddingVertical: 9,
                        borderBottomWidth:
                          index < rows.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.muted}>{item._id}</Text>
                    <Text
                      style={{
                        fontWeight: "900",
                        color: colors.text,
                      }}
                    >
                      {item.count ?? item.revenue ?? 0}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No data yet.</Text>
              )}
            </View>
          ))}
        </>
      )}

      {/* COMMISSION */}
      {resource === "commission" && (
        <View style={styles.card}>
          <Text
            style={{
              fontSize: 19,
              fontWeight: "900",
              color: colors.text,
            }}
          >
            Commission & revenue
          </Text>

          <Text style={[styles.muted, { marginTop: 7, marginBottom: 12 }]}>
            Configure the platform commission and review live payment totals.
          </Text>

          <Field
            label="Commission percentage"
            value={String(data?.commissionPercent ?? 0)}
            onChangeText={(value) =>
              updateSettings("commissionPercent", Number(value))
            }
            keyboardType="numeric"
          />

          <Text style={{ marginBottom: 8, color: colors.text }}>
            Gross revenue:{" "}
            <Text style={{ fontWeight: "900" }}>
              ₹{data?.grossRevenue || 0}
            </Text>
          </Text>

          <Text style={{ marginBottom: 8, color: colors.text }}>
            Commission:{" "}
            <Text style={{ fontWeight: "900" }}>
              ₹{data?.commission || 0}
            </Text>
          </Text>

          <Text style={{ marginBottom: 16, color: colors.text }}>
            Net revenue:{" "}
            <Text style={{ fontWeight: "900" }}>
              ₹{data?.netRevenue || 0}
            </Text>
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={saveSettings}
            disabled={busy}
          >
            <Text style={styles.buttonText}>
              {busy ? "Saving..." : "Save Commission"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* REPORTS */}
      {resource === "reports" && (
        <>
          {(Array.isArray(data) ? data : []).map((item) => (
            <View
              style={[styles.card, { marginBottom: 12 }]}
              key={item._id}
            >
              <Text style={styles.itemTitle}>
                {item.reason || item.targetType || "Report"}
              </Text>

              <Text style={[styles.muted, { marginTop: 5 }]}>
                {item.description || "No description"}
              </Text>

              <Text style={[styles.meta, { marginTop: 7 }]}>
                Reported by{" "}
                {item.reporter?.name ||
                  item.reporter?.email ||
                  "User"}
              </Text>

              <View style={[styles.actionRow, { flexWrap: "wrap" }]}>
                {statuses.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.smallButton,
                      item.status === status && {
                        backgroundColor: colors.softPrimary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setReport(item._id, status)}
                  >
                    <Text style={styles.smallButtonText}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Field
                label="Admin notes"
                value={item.adminNotes || ""}
                onChangeText={(value) =>
                  setData((previous) =>
                    previous.map((report) =>
                      report._id === item._id
                        ? { ...report, adminNotes: value }
                        : report
                    )
                  )
                }
                multiline
                placeholder="Internal moderation notes"
              />

              <TouchableOpacity
                style={styles.smallButton}
                onPress={async () => {
                  try {
                    await api.patch(`/admin/reports/${item._id}`, {
                      adminNotes: item.adminNotes || "",
                    });
                    await load();
                    toast.success("Admin notes saved.");
                  } catch (error) {
                    toast.error(apiError(error));
                  }
                }}
              >
                <Text style={styles.smallButtonText}>Save notes</Text>
              </TouchableOpacity>
            </View>
          ))}

          {!(Array.isArray(data) ? data : []).length && (
            <Empty text="No reports found." />
          )}
        </>
      )}

      {/* CONTACT ENQUIRIES */}
      {resource === "enquiries" && (
        <>
          {(Array.isArray(data) ? data : []).map((item) => (
            <View
              style={[styles.card, { marginBottom: 12 }]}
              key={item._id}
            >
              <Text style={styles.itemTitle}>{item.subject}</Text>

              <Text style={[styles.muted, { marginTop: 5 }]}>
                {item.name} • {item.email}
              </Text>

              <Text
                style={{
                  marginTop: 10,
                  lineHeight: 22,
                  color: colors.text,
                }}
              >
                {item.message}
              </Text>

              <Text style={[styles.meta, { marginTop: 8 }]}>
                Status: {item.status}
              </Text>

              <View style={[styles.actionRow, { flexWrap: "wrap" }]}>
                {["new", "in_progress", "resolved"].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.smallButton,
                      item.status === status && {
                        backgroundColor: colors.softPrimary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setEnquiry(item._id, status)}
                  >
                    <Text style={styles.smallButtonText}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {!(Array.isArray(data) ? data : []).length && (
            <Empty text="No contact enquiries found." />
          )}
        </>
      )}
    </ScrollView>
  );
}
