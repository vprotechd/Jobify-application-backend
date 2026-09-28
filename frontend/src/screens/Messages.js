import { useTheme } from "../context/ThemeContext";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api, { apiError } from "../services/api";
import { Empty, Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";
import { useAuth } from "../context/AuthContext";
import { connectNotificationSocket, onMessage, onSentMessage } from "../services/socket";

export default function Messages({ route, navigation }) {const { mode: __themeMode } = useTheme();
  const { user } = useAuth();
  const applicationId = route.params?.applicationId;
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(applicationId || null);
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
      if (!selectedId && rows[0]?.applicationId) setSelectedId(String(rows[0].applicationId));
    } catch (error) {
      setConversations([]);
    } finally { setLoading(false); }
  }, [selectedId]);

  const loadMessages = useCallback(async (id = selectedId) => {
    if (!id) return;
    setChatLoading(true);
    try {
      const response = await api.get(`/messages/applications/${id}`);
      setApplication(response.data?.application || null);
      setMessages(response.data?.messages || []);
    } catch (error) {
      setMessages([]);
      if (String(error?.response?.status) === "403") setApplication({ error: apiError(error) });
    } finally { setChatLoading(false); }
  }, [selectedId]);

  useFocusEffect(useCallback(() => { loadConversations(); }, [loadConversations]));
  useEffect(() => { if (selectedId) loadMessages(selectedId); }, [selectedId, loadMessages]);
  useEffect(() => {
    if (!selectedId) return;
    const timer = setInterval(() => loadMessages(selectedId), 5000);
    return () => clearInterval(timer);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    let offNew;
    let offSent;
    let mounted = true;
    (async () => {
      await connectNotificationSocket();
      if (!mounted) return;
      const append = (incoming) => {
        if (!incoming?.application || !incoming?._id) return;
        // The backend returns application as an ObjectId in some deployments and
        // as a populated document in others; refresh guarantees canonical state.
        loadMessages(selectedId);
      };
      offNew = onMessage(append);
      offSent = onSentMessage(append);
    })();
    return () => { mounted = false; offNew?.(); offSent?.(); };
  }, [selectedId, loadMessages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const response = await api.post(`/messages/applications/${selectedId}`, { body });
      if (response.data?.message) setMessages(current => [...current, response.data.message]);
      setDraft("");
      loadConversations();
    } catch (error) {} finally { setSending(false); }
  };

  const otherName = (conversation) => {
    if (user?.role === "jobseeker") return conversation?.recruiter?.name || "Recruiter";
    return conversation?.candidate?.name || conversation?.otherUser?.name || "Candidate";
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, padding: 20, paddingBottom: 0 }}>
        <Header eyebrow="Jobify" title="Messages" subtitle={user?.role === "jobseeker" ? "Conversations connected to your job applications." : "Conversations with candidates connected to your applications."} />
        {loading ? <Loader /> : !conversations.length ? <Empty text={user?.role === "jobseeker" ? "Apply for a job to start messaging a recruiter." : "Unlock a candidate CV from an application to start messaging."} /> : (
          <View style={{ flex: 1, flexDirection: "row", gap: 12 }}>
            <ScrollView style={{ width: Platform.OS === "web" ? 280 : 125 }} contentContainerStyle={{ paddingBottom: 30 }}>
              {conversations.map((conversation) => {
                const id = String(conversation.applicationId);
                const active = id === String(selectedId);
                return <TouchableOpacity key={id} onPress={() => setSelectedId(id)} style={[styles.card, { marginBottom: 8, padding: 12, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.softPrimary : colors.card }]}>
                  <Text style={{ color: colors.text, fontWeight: "800" }} numberOfLines={1}>{otherName(conversation)}</Text>
                  <Text style={styles.muted} numberOfLines={1}>{conversation.job?.title || "Application"}</Text>
                  {conversation.lastMessage?.body ? <Text style={[styles.muted, { marginTop: 5 }]} numberOfLines={1}>{conversation.lastMessage.body}</Text> : null}{conversation.unread > 0 ? <View style={{ marginTop: 6, alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>{conversation.unread} new</Text></View> : null}
                </TouchableOpacity>;
              })}
            </ScrollView>
            <View style={{ flex: 1, minWidth: 0 }}>
              {!selectedId ? <Empty text="Select a conversation." /> : <View style={[styles.card, { flex: 1, padding: 0, overflow: "hidden" }]}>
                <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text }}>{application?.job?.title || "Conversation"}</Text>
                  <Text style={styles.muted}>{application?.error || (user?.role === "jobseeker" ? "Recruiter" : "Candidate")}</Text>
                </View>
                {chatLoading ? <Loader /> : <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }} style={{ flex: 1 }}>
                  {!messages.length ? <Text style={[styles.muted, { textAlign: "center", marginTop: 25 }]}>No messages yet. Start the conversation.</Text> : messages.map((message) => {
                    const mine = String(message.sender?._id || message.sender) === String(user?._id || user?.id);
                    return <View key={message._id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", backgroundColor: mine ? colors.primary : colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 }}>
                      <Text style={{ color: mine ? "#fff" : colors.text, lineHeight: 20 }}>{message.body}</Text>
                      <Text style={{ color: mine ? "rgba(255,255,255,.75)" : colors.muted, fontSize: 10, marginTop: 4 }}>{new Date(message.createdAt).toLocaleString()}</Text>
                    </View>;
                  })}
                </ScrollView>}
                <View style={{ flexDirection: "row", alignItems: "flex-end", padding: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
                  <TextInput value={draft} onChangeText={setDraft} multiline placeholder="Write a message..." placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, minHeight: 45, maxHeight: 110, marginBottom: 0 }]} editable={!sending && !application?.error} />
                  <TouchableOpacity onPress={send} disabled={sending || !draft.trim() || !!application?.error} style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: sending || !draft.trim() ? .55 : 1 }}><Ionicons name="send" size={19} color="#fff" /></TouchableOpacity>
                </View>
              </View>}
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
