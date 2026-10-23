
import { useTheme } from "../context/ThemeContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
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

// At and above this width the conversation list and the chat sit side by side
// (tablet / laptop / desktop). Below it, phones show one pane at a time.
const WIDE_BREAKPOINT = 768;

// Long words, URLs and e-mail addresses must wrap instead of widening the screen.
const wrapText =
  Platform.OS === "web"
    ? { wordBreak: "break-word", overflowWrap: "anywhere" }
    : null;

const timeLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const clock = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (date.toDateString() === new Date().toDateString()) return clock;
  return `${date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  })}, ${clock}`;
};

export default function Messages({ route, navigation }) {
  const { mode: __themeMode } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const isWide = width >= WIDE_BREAKPOINT;
  const isWideRef = useRef(isWide);
  isWideRef.current = isWide;

  const applicationId = route.params?.applicationId;

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(
    applicationId ? String(applicationId) : null
  );
  // Phones: which pane is visible. Opening from an application goes straight to the chat.
  const [mobileView, setMobileView] = useState(
    applicationId ? "chat" : "list"
  );
  const [messages, setMessages] = useState([]);
  const [application, setApplication] = useState(null);
  const [chatError, setChatError] = useState("");
  const [listError, setListError] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);

  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get("/messages/conversations");
      const rows = response.data?.conversations || [];

      setConversations(rows);
      setListError("");

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

        // Wide screens open the first conversation; phones show the list first.
        if (isWideRef.current && rows[0]?.applicationId) {
          return String(rows[0].applicationId);
        }

        return current && !isWideRef.current ? current : null;
      });
    } catch (error) {
      setListError(apiError(error, "Unable to load your conversations."));
    } finally {
      setLoading(false);
    }
  }, []);

  // `silent` refreshes (polling / socket events) must not flash a spinner.
  const loadMessages = useCallback(async (id, silent = false) => {
    if (!id) {
      setMessages([]);
      setApplication(null);
      setChatError("");
      return;
    }

    if (!silent) setChatLoading(true);

    try {
      const response = await api.get(`/messages/applications/${id}`);

      setApplication(response.data?.application || null);
      setMessages(response.data?.messages || []);
      setChatError("");
    } catch (error) {
      if (!silent) setMessages([]);
      setChatError(
        String(error?.response?.status) === "403"
          ? apiError(error)
          : apiError(error, "Unable to load this conversation.")
      );
    } finally {
      if (!silent) setChatLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  // When the screen is resized from phone to tablet width, make sure a chat is open.
  useEffect(() => {
    if (isWide && !selectedId && conversations[0]?.applicationId) {
      setSelectedId(String(conversations[0].applicationId));
    }
  }, [isWide, selectedId, conversations]);

  useEffect(() => {
    stickToBottom.current = true;
    setDraft("");

    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
      setApplication(null);
      setChatError("");
    }
  }, [selectedId, loadMessages]);

  useEffect(() => {
    if (!selectedId) return undefined;

    const timer = setInterval(() => {
      loadMessages(selectedId, true);
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

          loadMessages(selectedId, true);
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

  const openConversation = (id) => {
    setSelectedId(String(id));
    setMobileView("chat");
  };

  const backToList = () => {
    setMobileView("list");
    loadConversations();
  };

  const send = async () => {
    const body = draft.trim();

    if (!body || !selectedId || sending || chatError) {
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
          if (current.some((message) => message._id === newMessage._id)) {
            return current;
          }

          return [...current, newMessage];
        });
      }

      stickToBottom.current = true;
      setDraft("");
      await loadConversations();
    } catch (error) {
      Alert.alert("Message", apiError(error, "Unable to send message."));
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyPress = (event) => {
    // Web: Enter sends, Shift+Enter adds a new line. Touch keyboards keep Enter as a new line.
    if (
      Platform.OS === "web" &&
      event?.nativeEvent?.key === "Enter" &&
      !event?.nativeEvent?.shiftKey
    ) {
      event.preventDefault?.();
      send();
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

  const selectedConversation = conversations.find(
    (conversation) => String(conversation.applicationId) === String(selectedId)
  );

  const showList = isWide || mobileView === "list" || !selectedId;
  const showChat = !!selectedId && (isWide || mobileView === "chat");

  const composerDisabled = sending || !!chatError;
  const canSend = !composerDisabled && !!draft.trim() && !!selectedId;

  const lastMineIndex = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (getSenderId(messages[index]) === currentUserId) return index;
    }
    return -1;
  })();

  const renderConversationList = () => (
    <ScrollView
      style={{
        width: isWide ? 300 : "100%",
        flexGrow: isWide ? 0 : 1,
        flexShrink: 0,
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {listError ? (
        <View style={[styles.error, { marginBottom: 10 }]}>
          <Text style={[styles.errorText, wrapText]}>{listError}</Text>
          <TouchableOpacity
            onPress={loadConversations}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text style={{ color: colors.primary, fontWeight: "800" }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {conversations.map((conversation) => {
        const id = String(conversation.applicationId);
        const active = isWide && id === String(selectedId);
        const name = otherName(conversation);

        return (
          <TouchableOpacity
            key={id}
            onPress={() => openConversation(id)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Open conversation with ${name}`}
            style={[
              styles.card,
              {
                marginBottom: 9,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.softPrimary : colors.card,
              },
            ]}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.softPrimary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "900",
                  fontSize: 16,
                }}
              >
                {String(name).charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontWeight: "800",
                  }}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  {timeLabel(conversation.lastMessage?.createdAt)}
                </Text>
              </View>

              <Text
                style={[styles.muted, { marginTop: 3, fontSize: 12 }]}
                numberOfLines={1}
              >
                {conversation.job?.title || "Application"}
              </Text>

              {conversation.lastMessage?.body ? (
                <Text
                  style={[styles.muted, { marginTop: 4 }]}
                  numberOfLines={1}
                >
                  {conversation.lastMessage.body}
                </Text>
              ) : null}
            </View>

            {conversation.unread > 0 ? (
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  minWidth: 22,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: "900",
                  }}
                >
                  {conversation.unread > 99 ? "99+" : conversation.unread}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderChat = () => (
    <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
      <View
        style={[
          styles.card,
          {
            flex: 1,
            minHeight: 0,
            padding: 0,
            marginBottom: 0,
            overflow: "hidden",
          },
        ]}
      >
        {/* Conversation header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          {!isWide ? (
            <TouchableOpacity
              onPress={backToList}
              accessibilityRole="button"
              accessibilityLabel="Back to conversations"
              hitSlop={8}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : null}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                color: colors.text,
              }}
              numberOfLines={2}
            >
              {application?.job?.title ||
                selectedConversation?.job?.title ||
                "Conversation"}
            </Text>

            <Text
              style={[styles.muted, { marginTop: 3 }, wrapText]}
              numberOfLines={chatError ? 3 : 1}
            >
              {chatError ||
                (selectedConversation
                  ? otherName(selectedConversation)
                  : user?.role === "jobseeker"
                    ? "Recruiter"
                    : "Candidate")}
            </Text>
          </View>
        </View>

        {/* Messages */}
        {chatLoading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 12,
              gap: 9,
              flexGrow: 1,
              justifyContent: messages.length ? "flex-start" : "center",
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={100}
            onScroll={(event) => {
              const { layoutMeasurement, contentOffset, contentSize } =
                event.nativeEvent;
              stickToBottom.current =
                contentSize.height -
                  (contentOffset.y + layoutMeasurement.height) <
                80;
            }}
            onContentSizeChange={() => {
              if (stickToBottom.current) {
                scrollRef.current?.scrollToEnd?.({ animated: false });
              }
            }}
          >
            {chatError ? (
              <View style={{ alignItems: "center", padding: 12 }}>
                <Text
                  style={[styles.muted, { textAlign: "center" }, wrapText]}
                >
                  {chatError}
                </Text>
                {!/unlock/i.test(chatError) ? (
                  <TouchableOpacity
                    onPress={() => loadMessages(selectedId)}
                    style={{ marginTop: 10 }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "800" }}>
                      Try again
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : !messages.length ? (
              <Text style={[styles.muted, { textAlign: "center" }]}>
                No messages yet. Start the conversation.
              </Text>
            ) : (
              messages.map((message, index) => {
                const mine = getSenderId(message) === currentUserId;

                return (
                  <View
                    key={message._id}
                    style={{
                      alignSelf: mine ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      backgroundColor: mine ? colors.primary : colors.surface,
                      borderRadius: 16,
                      paddingHorizontal: 13,
                      paddingVertical: 10,
                      borderBottomRightRadius: mine ? 5 : 16,
                      borderBottomLeftRadius: mine ? 16 : 5,
                    }}
                  >
                    <Text
                      selectable
                      style={[
                        {
                          color: mine ? "#fff" : colors.text,
                          lineHeight: 21,
                          flexShrink: 1,
                        },
                        wrapText,
                      ]}
                    >
                      {message.body}
                    </Text>

                    <Text
                      style={{
                        color: mine ? "rgba(255,255,255,0.75)" : colors.muted,
                        fontSize: 10,
                        marginTop: 5,
                      }}
                    >
                      {timeLabel(message.createdAt)}
                      {mine && index === lastMineIndex && message.readAt
                        ? " · Seen"
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
            onKeyPress={onComposerKeyPress}
            multiline
            placeholder={
              chatError ? "Messaging unavailable" : "Write a message..."
            }
            placeholderTextColor={colors.muted}
            editable={!composerDisabled}
            maxLength={5000}
            style={[
              styles.input,
              {
                flex: 1,
                minWidth: 0,
                minHeight: 48,
                maxHeight: 120,
                marginBottom: 0,
                paddingTop: 13,
                paddingBottom: 13,
              },
            ]}
          />

          <TouchableOpacity
            onPress={send}
            disabled={!canSend}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: canSend || sending ? 1 : 0.5,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1100,
          alignSelf: "center",
          minHeight: 0,
          overflow: "hidden",
          paddingHorizontal: isWide ? 16 : 12,
          paddingTop: 40,
          paddingBottom: 8,
        }}
      >
        {/* On phones the open chat has its own compact header, so the page header is hidden. */}
        {isWide || !showChat ? (
          <Header
            eyebrow="Jobify"
            title="Messages"
            subtitle={
              user?.role === "jobseeker"
                ? "Conversations connected to your job applications."
                : "Conversations with candidates connected to your applications."
            }
          />
        ) : null}

        {loading ? (
          <Loader />
        ) : listError && !conversations.length ? (
          <View style={styles.error}>
            <Text style={[styles.errorText, wrapText]}>{listError}</Text>
            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                loadConversations();
              }}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            >
              <Text style={{ color: colors.primary, fontWeight: "800" }}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
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
              flexDirection: isWide ? "row" : "column",
              gap: 12,
              minHeight: 0,
              minWidth: 0,
            }}
          >
            {showList ? renderConversationList() : null}
            {showChat ? renderChat() : null}
            {isWide && !selectedId ? (
              <View style={{ flex: 1 }}>
                <Empty text="Select a conversation." />
              </View>
            ) : null}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
