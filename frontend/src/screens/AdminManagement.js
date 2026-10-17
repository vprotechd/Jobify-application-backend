
import { useTheme } from "../context/ThemeContext";
import React, { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import api, { apiError } from "../services/api";
import { Empty, Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";

const configs = {
  users: {
    title: "Users",
    key: "users",
    endpoint: "/admin/users",
  },
  recruiters: {
    title: "Recruiters",
    key: "recruiters",
    endpoint: "/admin/recruiters",
  },
  jobs: {
    title: "Jobs",
    key: "jobs",
    endpoint: "/admin/jobs",
  },
  applications: {
    title: "Applications",
    key: "applications",
    endpoint: "/admin/applications",
  },
  companies: {
    title: "Companies",
    key: "companies",
    endpoint: "/admin/companies",
  },
};

export default function AdminManagement({ route, navigation }) {
  const { mode: __themeMode } = useTheme();

  const resource = route.params?.resource || "users";
  const cfg = configs[resource] || configs.users;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [refresh, setRefresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get(cfg.endpoint);
      setData(
        Array.isArray(response.data?.[cfg.key])
          ? response.data[cfg.key]
          : []
      );
    } catch (error) {
      Alert.alert(
        cfg.title,
        apiError(error, `Unable to load ${cfg.title.toLowerCase()}.`)
      );
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, [cfg.endpoint, cfg.key, cfg.title]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = data.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(q.toLowerCase().trim())
  );

  const update = async (id, body) => {
    try {
      await api.patch(`${cfg.endpoint}/${id}`, body);
      await load();
    } catch (error) {
      Alert.alert(
        "Update",
        apiError(error, "Unable to update record.")
      );
    }
  };

  const remove = (id) => {
    Alert.alert(
      "Delete job",
      "Delete this job and its applications?",
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
              await api.delete(`/admin/jobs/${id}`);
              await load();
            } catch (error) {
              Alert.alert("Delete", apiError(error));
            }
          },
        },
      ]
    );
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
      refreshControl={
        <RefreshControl
          refreshing={refresh}
          onRefresh={() => {
            setRefresh(true);
            load();
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        style={{ alignSelf: "flex-start", marginBottom: 16 }}
      >
        <Text
          style={{
            color: colors.primary,
            fontWeight: "800",
            fontSize: 15,
          }}
        >
          ‹ Back
        </Text>
      </TouchableOpacity>

      <Header
        eyebrow="Administrator"
        title={cfg.title}
        subtitle={`Manage ${cfg.title.toLowerCase()} across Jobify.`}
      />

      <TextInput
        style={[
          styles.input,
          {
            marginTop: 8,
            marginBottom: 16,
          },
        ]}
        value={q}
        onChangeText={setQ}
        placeholder={`Search ${cfg.title.toLowerCase()}...`}
        placeholderTextColor="#94a3b8"
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={`Search ${cfg.title.toLowerCase()}`}
      />

      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <Empty text={`No ${cfg.title.toLowerCase()} found.`} />
      ) : (
        filtered.map((item) => (
          <View
            style={[styles.card, { marginBottom: 12 }]}
            key={item._id}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: colors.text,
              }}
            >
              {item.name || item.title || item.email || item._id}
            </Text>

            <Text
              style={[
                styles.muted,
                {
                  marginTop: 5,
                  lineHeight: 20,
                },
              ]}
            >
              {item.email ||
                item.location ||
                item.status ||
                item.company?.name ||
                "Record"}
            </Text>

            {resource === "users" && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <TouchableOpacity
                  style={styles.outline}
                  onPress={() =>
                    update(item._id, {
                      isActive: item.isActive === false,
                    })
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.outlineText}>
                    {item.isActive === false
                      ? "Activate"
                      : "Deactivate"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outline}
                  onPress={() =>
                    update(item._id, { isVerified: true })
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.outlineText}>Verify</Text>
                </TouchableOpacity>
              </View>
            )}

            {resource === "jobs" && (
              <TouchableOpacity
                style={[styles.outline, { marginTop: 12 }]}
                onPress={() => remove(item._id)}
                activeOpacity={0.75}
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
            )}

            {resource === "applications" && (
              <Text
                style={{
                  marginTop: 8,
                  color: colors.primary,
                  fontWeight: "800",
                }}
              >
                {item.status || "pending"}
              </Text>
            )}

            {resource === "companies" && (
              <TouchableOpacity
                style={[styles.outline, { marginTop: 12 }]}
                onPress={() =>
                  update(item._id, {
                    isActive: item.isActive === false,
                  })
                }
                activeOpacity={0.75}
              >
                <Text style={styles.outlineText}>
                  {item.isActive === false
                    ? "Activate"
                    : "Deactivate"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
