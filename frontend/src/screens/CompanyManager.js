
import { useTheme } from "../context/ThemeContext";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api, { apiError } from "../services/api";
import {
  Field,
  Header,
  Loader,
  Empty,
  styles,
} from "../components/common";
import { colors } from "../theme/theme";

const blank = {
  name: "",
  industry: "",
  location: "",
  description: "",
  website: "",
  employeeCount: "",
  logo: "",
};

export default function CompanyManager() {
  const { mode: __themeMode } = useTheme();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [logoFile, setLogoFile] = useState(null);

  const load = async () => {
    try {
      const response = await api.get("/companies/recruiter/mine");
      setCompanies(response.data.companies || []);
    } catch (error) {
      Alert.alert("Companies", apiError(error));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const pickLogo = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo access to select a company logo."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        setLogoFile({
          uri: asset.uri,
          name: asset.fileName || "company-logo.jpg",
          type: asset.mimeType || "image/jpeg",
        });

        setForm((current) => ({
          ...current,
          logo: asset.uri,
        }));
      }
    } catch (error) {
      Alert.alert("Logo", "Unable to select the company logo.");
    }
  };

  const reset = () => {
    setForm(blank);
    setLogoFile(null);
    setEditing(null);
    setShow(false);
  };

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert("Company", "Company name is required.");
      return;
    }

    setBusy(true);

    try {
      const formData = new FormData();

      [
        "name",
        "industry",
        "location",
        "description",
        "website",
        "employeeCount",
      ].forEach((key) => {
        formData.append(key, form[key] || "");
      });

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      if (editing) {
        await api.put(`/companies/${editing}`, formData);
      } else {
        await api.post("/companies", formData);
      }

      Alert.alert(
        "Company",
        editing
          ? "Company updated successfully."
          : "Company created successfully."
      );

      reset();
      await load();
    } catch (error) {
      Alert.alert(
        "Company",
        apiError(error, "Unable to save company.")
      );
    } finally {
      setBusy(false);
    }
  };

  const edit = (company) => {
    setEditing(company._id);
    setForm({ ...blank, ...company });
    setLogoFile(null);
    setShow(true);
  };

  const remove = (company) => {
    Alert.alert(
      "Delete company",
      `Delete ${company.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/companies/${company._id}`);

              Alert.alert(
                "Company",
                "Company deleted successfully."
              );

              await load();
            } catch (error) {
              Alert.alert(
                "Delete",
                apiError(error, "Unable to delete company.")
              );
            }
          },
        },
      ]
    );
  };

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
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
      keyboardShouldPersistTaps="handled"
    >
      <Header
        title="My Companies"
        subtitle="Add, update and manage the company details used on your job listings."
      />

      <TouchableOpacity
        style={[styles.button, { marginBottom: 16 }]}
        activeOpacity={0.8}
        onPress={() => {
          if (show) {
            reset();
          } else {
            setEditing(null);
            setForm(blank);
            setLogoFile(null);
            setShow(true);
          }
        }}
      >
        <Text style={styles.buttonText}>
          {show ? "Close Form" : "+ Add Company"}
        </Text>
      </TouchableOpacity>

      {show && (
        <View style={styles.card}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: colors.text,
              marginBottom: 14,
            }}
          >
            {editing ? "Edit Company" : "Add Company"}
          </Text>

          <TouchableOpacity
            style={[
              styles.outline,
              {
                alignItems: "center",
                marginBottom: 14,
              },
            ]}
            onPress={pickLogo}
            activeOpacity={0.75}
          >
            <Text style={styles.outlineText}>
              {form.logo
                ? "Change Company Logo"
                : "＋ Add Company Logo"}
            </Text>
          </TouchableOpacity>

          {form.logo ? (
            <Image
              source={{ uri: form.logo }}
              resizeMode="cover"
              style={{
                width: 100,
                height: 100,
                borderRadius: 18,
                alignSelf: "center",
                marginBottom: 18,
              }}
            />
          ) : null}

          <Field
            label="Company name *"
            value={form.name}
            onChangeText={(value) =>
              updateField("name", value)
            }
          />

          <Field
            label="Industry"
            value={form.industry}
            onChangeText={(value) =>
              updateField("industry", value)
            }
          />

          <Field
            label="Location"
            value={form.location}
            onChangeText={(value) =>
              updateField("location", value)
            }
          />

          <Field
            label="Website"
            value={form.website}
            onChangeText={(value) =>
              updateField("website", value)
            }
          />

          <Field
            label="Employees"
            value={String(form.employeeCount ?? "")}
            onChangeText={(value) =>
              updateField("employeeCount", value)
            }
          />

          <Field
            label="Description"
            value={form.description}
            onChangeText={(value) =>
              updateField("description", value)
            }
            multiline
          />

          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 8 },
            ]}
            onPress={save}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {busy
                ? "Saving..."
                : editing
                  ? "Update Company"
                  : "Create Company"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <Loader />
      ) : companies.length === 0 ? (
        <Empty text="No companies yet. Create one before posting jobs." />
      ) : (
        companies.map((company) => (
          <View
            style={styles.card}
            key={company._id}
          >
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
              }}
            >
              {company.logo ? (
                <Image
                  source={{ uri: company.logo }}
                  resizeMode="cover"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                    backgroundColor: colors.primary + "18",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "900",
                      color: colors.primary,
                    }}
                  >
                    {company.name?.charAt(0)?.toUpperCase() || "C"}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                  }}
                >
                  {company.name}
                </Text>

                <Text
                  style={[
                    styles.muted,
                    { marginTop: 5 },
                  ]}
                >
                  {company.industry || "Industry not set"}
                </Text>

                <Text
                  style={[
                    styles.muted,
                    { marginTop: 3 },
                  ]}
                >
                  {company.location || "Location not set"}
                </Text>
              </View>
            </View>

            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 14,
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: company.isVerified
                  ? colors.success + "18"
                  : colors.warning + "18",
              }}
            >
              <Text
                style={{
                  color: company.isVerified
                    ? colors.success
                    : colors.warning,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                {company.isVerified
                  ? "✓ Verified"
                  : "Verification pending"}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 14,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.outline,
                  { flex: 1 },
                ]}
                onPress={() => edit(company)}
                activeOpacity={0.75}
              >
                <Text style={styles.outlineText}>
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outline,
                  {
                    flex: 1,
                    borderColor: colors.danger,
                  },
                ]}
                onPress={() => remove(company)}
                activeOpacity={0.75}
              >
                <Text
                  style={{
                    color: colors.danger,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
