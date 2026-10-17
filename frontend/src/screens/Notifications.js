
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../context/ThemeContext";
import api from "../services/api";
import { Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";
import { connectNotificationSocket } from "../services/socket";

const iconFor = (type) =>
  ({
    application: "document-text-outline",
    application_status: "checkmark-circle-outline",
    payment: "card-outline",
    job: "briefcase-outline",
  }[type] || "notifications-outline");

export default function Notifications({ navigation }) {
  const { mode: __themeMode } = useTheme();

  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get("/notifications?limit=100");
      const notifications = Array.isArray(
        response.data?.notifications
      )
        ? response.data.notifications
        : [];

      setItems(notifications);
      setUnread(Number(response.data?.unreadCount || 0));
    } catch (error) {
      // Keep the notification screen usable if the API is unavailable.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      load();

      const setupSocket = async () => {
        try {
          await connectNotificationSocket((item) => {
            if (!active || !item) return;

            setItems((previous) => {
              const alreadyExists = previous.some(
                (notification) => notification._id === item._id
              );

              if (!alreadyExists && !item.read) {
                setUnread((count) => count + 1);
              }

              return [
                item,
                ...previous.filter(
                  (notification) => notification._id !== item._id
                ),
              ];
            });
          });
        } catch (error) {
          // Existing notifications remain available without the socket.
        }
      };

      setupSocket();

      return () => {
        active = false;
      };
    }, [load])
  );

  const markRead = async (item) => {
    try {
      if (!item.read) {
        await api.patch(`/notifications/${item._id}/read`);

        setItems((previous) =>
          previous.map((notification) =>
            notification._id === item._id
              ? { ...notification, read: true }
              : notification
          )
        );

        setUnread((count) => Math.max(0, count - 1));
      }

      if (item.link) {
        const routes = [
          "CandidateApplications",
          "RecruiterApplications",
          "CvPackages",
          "Jobs",
          "Candidates",
          "AdminMenu",
        ];

        if (routes.includes(item.link)) {
          navigation.navigate(item.link);
        }
      }
    } catch (error) {
      // Keep the current screen state if marking as read fails.
    }
  };

  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all");

      setItems((previous) =>
        previous.map((item) => ({ ...item, read: true }))
      );
      setUnread(0);
    } catch (error) {
      // Keep the existing state if the request fails.
    }
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Header
        eyebrow="Jobify"
        title="Notifications"
        subtitle="Stay updated about applications, jobs and payments."
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontWeight: "800", color: colors.text }}>
          {unread} unread
        </Text>

        {unread > 0 && (
          <TouchableOpacity
            onPress={markAll}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            <Text
              style={{
                color: colors.primary,
                fontWeight: "800",
              }}
            >
              Mark all as read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <Loader />
      ) : items.length === 0 ? (
        <View
          style={[
            styles.card,
            {
              alignItems: "center",
              paddingVertical: 40,
              marginTop: 4,
            },
          ]}
        >
          <Ionicons
            name="notifications-off-outline"
            size={40}
            color="#94a3b8"
          />

          <Text
            style={{
              marginTop: 12,
              fontWeight: "800",
              color: colors.text,
              fontSize: 16,
            }}
          >
            You're all caught up
          </Text>

          <Text
            style={[
              styles.muted,
              {
                marginTop: 6,
                textAlign: "center",
                lineHeight: 20,
              },
            ]}
          >
            New activity will appear here.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <TouchableOpacity
            key={item._id}
            onPress={() => markRead(item)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.read ? "Read" : "Unread"}`}
            style={[
              styles.card,
              {
                borderWidth: 1,
                borderColor: item.read ? colors.border : colors.primary,
                backgroundColor: item.read ? colors.card : "#eff6ff",
                marginBottom: 12,
                padding: 15,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  backgroundColor: colors.background || "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={iconFor(item.type)}
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "900",
                      color: colors.text,
                      flex: 1,
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {item.title}
                  </Text>

                  {!item.read && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.primary,
                        marginTop: 6,
                      }}
                    />
                  )}
                </View>

                <Text
                  style={{
                    color: colors.muted,
                    lineHeight: 21,
                    marginTop: 5,
                    fontSize: 13,
                  }}
                >
                  {item.message}
                </Text>

                <Text
                  style={{
                    fontSize: 11,
                    color: colors.muted,
                    marginTop: 9,
                  }}
                >
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
