
import { useTheme } from "../context/ThemeContext";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api, { apiError } from "../services/api";
import { Empty, Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";
import { useAuth } from "../context/AuthContext";
import {
  connectNotificationSocket,
  onMessage,
  onSentMessage,
} from "../services/socket";

export default function Messages({ route, navigation }) {
  const { mode: __themeMode } = useTheme();
  const { user } = useAuth();

  const applicationId = route.params?.applicationId;

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(
    applicationId ? String(applicationId) : null
  );
  const [messages, setMessages] = useState([]);
  const [application, setApplication] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get("/messages/conversations");
      const rows = response.data?.conversations || [];

      setConversations(rows);

      setSelectedId((current) => {
        if (
          current &&
          rows.some(
            (conversation) =>
              String(conversation.applicationId) === String(current)
          )
        ) {
          return String(current);
        }

        return rows[0]?.applicationId
          ? String(rows[0].applicationId)
          : current;
      });
    } catch (error) {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (id = selectedId) => {
    if (!id) {
      setMessages([]);
      setApplication(null);
      return;
    }

    setChatLoading(true);

    try {
      const response = await api.get(
        `/messages/applications/${id}`
      );

      setApplication(response.data?.application || null);
      setMessages(response.data?.messages || []);
    } catch (error) {
      setMessages([]);

      if (String(error?.response?.status) === "403") {
        setApplication({
          error: apiError(error),
        });
      } else {
        setApplication((current) => ({
          ...(current || {}),
          error: apiError(error, "Unable to load this conversation."),
        }));
      }
    } finally {
      setChatLoading(false);
    }
  }, [selectedId]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
      setApplication(null);
    }
  }, [selectedId, loadMessages]);

  useEffect(() => {
    if (!selectedId) return undefined;

    const timer = setInterval(() => {
      loadMessages(selectedId);
    }, 5000);

    return () => clearInterval(timer);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    let offNew;
    let offSent;
    let mounted = true;

    const setupSocket = async () => {
      try {
        await connectNotificationSocket();

        if (!mounted) return;

        const refreshConversation = (incoming) => {
          if (!incoming?.application || !incoming?._id) return;

          loadMessages(selectedId);
          loadConversations();
        };

        offNew = onMessage(refreshConversation);
        offSent = onSentMessage(refreshConversation);
      } catch (error) {
        // Periodic refresh remains available if socket setup fails.
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      offNew?.();
      offSent?.();
    };
  }, [selectedId, loadMessages, loadConversations]);

  const send = async () => {
    const body = draft.trim();

    if (!body || !selectedId || sending || application?.error) {
      return;
    }

    setSending(true);

    try {
      const response = await api.post(
        `/messages/applications/${selectedId}`,
        { body }
      );

      if (response.data?.message) {
        const newMessage = response.data.message;

        setMessages((current) => {
          if (
            current.some(
              (message) => message._id === newMessage._id
            )
          ) {
            return current;
          }

          return [...current, newMessage];
        });
      }

      setDraft("");
      await loadConversations();
    } catch (error) {
      Alert.alert(
        "Message",
        apiError(error, "Unable to send message.")
      );
    } finally {
      setSending(false);
    }
  };

  const otherName = (conversation) => {
    if (user?.role === "jobseeker") {
      return conversation?.recruiter?.name || "Recruiter";
    }

    return (
      conversation?.candidate?.name ||
      conversation?.otherUser?.name ||
      "Candidate"
    );
  };

  const getSenderId = (message) =>
    String(message.sender?._id || message.sender || "");

  const currentUserId = String(user?._id || user?.id || "");

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 40,
          paddingBottom: 8,
        }}
      >
        <Header
          eyebrow="Jobify"
          title="Messages"
          subtitle={
            user?.role === "jobseeker"
              ? "Conversations connected to your job applications."
              : "Conversations with candidates connected to your applications."
          }
        />

        {loading ? (
          <Loader />
        ) : !conversations.length ? (
          <View style={{ marginTop: 8 }}>
            <Empty
              text={
                user?.role === "jobseeker"
                  ? "Apply for a job to start messaging a recruiter."
                  : "Unlock a candidate CV from an application to start messaging."
              }
            />
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              gap: 12,
              minHeight: 0,
            }}
          >
            {/* Conversation list */}
            <ScrollView
              style={{
                width: Platform.OS === "web" ? 260 : 120,
                flexGrow: 0,
              }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {conversations.map((conversation) => {
                const id = String(conversation.applicationId);
                const active = id === String(selectedId);

                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setSelectedId(id)}
                    activeOpacity={0.75}
                    style={[
                      styles.card,
                      {
                        marginBottom: 9,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: active
                          ? colors.primary
                          : colors.border,
                        backgroundColor: active
                          ? colors.softPrimary
                          : colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "800",
                      }}
                      numberOfLines={1}
                    >
                      {otherName(conversation)}
                    </Text>

                    <Text
                      style={[
                        styles.muted,
                        { marginTop: 5 },
                      ]}
                      numberOfLines={1}
                    >
                      {conversation.job?.title || "Application"}
                    </Text>

                    {conversation.lastMessage?.body ? (
                      <Text
                        style={[
                          styles.muted,
                          { marginTop: 6 },
                        ]}
                        numberOfLines={2}
                      >
                        {conversation.lastMessage.body}
                      </Text>
                    ) : null}

                    {conversation.unread > 0 ? (
                      <View
                        style={{
                          marginTop: 8,
                          alignSelf: "flex-start",
                          backgroundColor: colors.primary,
                          borderRadius: 10,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: "900",
                          }}
                        >
                          {conversation.unread} new
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Active chat */}
            <View style={{ flex: 1, minWidth: 0 }}>
              {!selectedId ? (
                <Empty text="Select a conversation." />
              ) : (
                <View
                  style={[
                    styles.card,
                    {
                      flex: 1,
                      minHeight: 0,
                      padding: 0,
                      overflow: "hidden",
                    },
                  ]}
                >
                  <View
                    style={{
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: colors.card,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "900",
                        color: colors.text,
                      }}
                      numberOfLines={2}
                    >
                      {application?.job?.title || "Conversation"}
                    </Text>

                    <Text
                      style={[
                        styles.muted,
                        { marginTop: 4 },
                      ]}
                    >
                      {application?.error ||
                        (user?.role === "jobseeker"
                          ? "Recruiter"
                          : "Candidate")}
                    </Text>
                  </View>

                  {chatLoading ? (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                      }}
                    >
                      <ActivityIndicator
                        size="large"
                        color={colors.primary}
                      />
                    </View>
                  ) : (
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{
                        padding: 14,
                        gap: 9,
                        flexGrow: 1,
                        justifyContent: messages.length
                          ? "flex-start"
                          : "center",
                      }}
                      showsVerticalScrollIndicator={false}
                    >
                      {!messages.length ? (
                        <Text
                          style={[
                            styles.muted,
                            { textAlign: "center" },
                          ]}
                        >
                          No messages yet. Start the conversation.
                        </Text>
                      ) : (
                        messages.map((message) => {
                          const mine =
                            getSenderId(message) === currentUserId;

                          return (
                            <View
                              key={message._id}
                              style={{
                                alignSelf: mine
                                  ? "flex-end"
                                  : "flex-start",
                                maxWidth: "85%",
                                backgroundColor: mine
                                  ? colors.primary
                                  : colors.surface,
                                borderRadius: 16,
                                paddingHorizontal: 13,
                                paddingVertical: 10,
                                borderBottomRightRadius: mine ? 5 : 16,
                                borderBottomLeftRadius: mine ? 16 : 5,
                              }}
                            >
                              <Text
                                style={{
                                  color: mine ? "#fff" : colors.text,
                                  lineHeight: 21,
                                }}
                              >
                                {message.body}
                              </Text>

                              <Text
                                style={{
                                  color: mine
                                    ? "rgba(255,255,255,0.75)"
                                    : colors.muted,
                                  fontSize: 10,
                                  marginTop: 5,
                                }}
                              >
                                {message.createdAt
                                  ? new Date(
                                      message.createdAt
                                    ).toLocaleString()
                                  : ""}
                              </Text>
                            </View>
                          );
                        })
                      )}
                    </ScrollView>
                  )}

                  {/* Message composer */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      padding: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      gap: 8,
                      backgroundColor: colors.card,
                    }}
                  >
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      multiline
                      placeholder="Write a message..."
                      placeholderTextColor={colors.muted}
                      editable={!sending && !application?.error}
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          minHeight: 46,
                          maxHeight: 110,
                          marginBottom: 0,
                          paddingTop: 12,
                          paddingBottom: 12,
                        },
                      ]}
                    />

                    <TouchableOpacity
                      onPress={send}
                      disabled={
                        sending ||
                        !draft.trim() ||
                        !selectedId ||
                        !!application?.error
                      }
                      activeOpacity={0.75}
                      accessibilityLabel="Send message"
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 13,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity:
                          sending ||
                          !draft.trim() ||
                          !!application?.error
                            ? 0.55
                            : 1,
                      }}
                    >
                      {sending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Ionicons
                          name="send"
                          size={19}
                          color="#fff"
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
