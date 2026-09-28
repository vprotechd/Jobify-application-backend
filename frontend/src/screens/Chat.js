import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api, { apiError } from "../services/api";
import { Header, Loader } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";
import { connectNotificationSocket, onChatMessage } from "../services/socket";

export default function Chat({ route, navigation }) {
  const { user } = useAuth();
  const applicationId = route.params?.applicationId || route.params?.id;
  const application = route.params?.application;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState(false);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    try {
      const r = await api.get(`/messages/applications/${applicationId}`);
      setMessages(r.data.messages || []);
      setLocked(false);
    } catch (e) {
      if (e?.response?.status === 403 || e?.response?.data?.code === "CV_UNLOCK_REQUIRED") {
        setLocked(true);
      } else {
        Alert.alert("Chat", apiError(e, "Unable to load chat."));
      }
    } finally { setLoading(false); }
  }, [applicationId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let active = true;
    let cleanup;
    (async () => {
      await connectNotificationSocket();
      cleanup = onChatMessage((incoming) => {
        if (!active || String(incoming?.application) !== String(applicationId)) return;
        setMessages(prev => prev.some(x => String(x._id) === String(incoming._id)) ? prev : [...prev, incoming]);
      });
    })();
    return () => { active = false; cleanup?.(); };
  }, [applicationId]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd?.({ animated: true }));
  }, [messages.length]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending || locked) return;
    setSending(true);
    try {
      const r = await api.post(`/messages/applications/${applicationId}`, { text: value });
      const message = r.data.message;
      setMessages(prev => prev.some(x => String(x._id) === String(message?._id)) ? prev : [...prev, message]);
      setText("");
    } catch (e) {
      Alert.alert("Message", apiError(e, "Unable to send message."));
    } finally { setSending(false); }
  };

  const title = application?.job?.title || "Application chat";
  const person = application?.candidate?.name || application?.recruiter?.name || "Jobify";

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
    <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
      <Header title="Messages" subtitle={`${title}${person ? ` • ${person}` : ""}`} />
      {loading ? <Loader /> : locked ? <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 22 }}>
        <Text style={{ fontSize: 21, fontWeight: "900", color: colors.text }}>CV unlock required</Text>
        <Text style={{ marginTop: 8, lineHeight: 22, color: colors.muted }}>The recruiter must unlock the candidate CV before recruiter-side messages can be viewed or sent.</Text>
        <TouchableOpacity style={{ marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: "center" }} onPress={() => navigation.goBack()}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>Back to application</Text>
        </TouchableOpacity>
      </View> : messages.map((m) => {
        const mine = String(m.sender?._id || m.sender) !== String(application?.candidate?._id) ? route.params?.myMessageSide === "recruiter" ? true : false : route.params?.myMessageSide === "candidate" ? true : false;
        // If the caller did not supply a side, rely on the current user's sender id when available.
        const myId = user?._id || user?.id;
        const isMine = myId ? String(m.sender?._id || m.sender) === String(myId) : mine;
        return <View key={m._id} style={{ alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 10 }}>
          <View style={{ maxWidth: "82%", backgroundColor: isMine ? colors.primary : colors.card, borderWidth: isMine ? 0 : 1, borderColor: colors.border, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 11 }}>
            <Text style={{ color: isMine ? "#fff" : colors.text, lineHeight: 20 }}>{m.text}</Text>
            <Text style={{ color: isMine ? "rgba(255,255,255,.75)" : colors.muted, fontSize: 10, marginTop: 5, textAlign: "right" }}>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</Text>
          </View>
        </View>;
      })}
    </ScrollView>
    {!locked && <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, paddingBottom: Platform.OS === "ios" ? 24 : 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      <TextInput value={text} onChangeText={setText} placeholder="Type a message..." placeholderTextColor="#9A8B80" multiline maxLength={4000} style={{ flex: 1, maxHeight: 110, minHeight: 46, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, color: colors.text }} />
      <TouchableOpacity onPress={send} disabled={sending || !text.trim()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: sending || !text.trim() ? "#F0C6B5" : colors.primary, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 21, fontWeight: "900" }}>➤</Text>
      </TouchableOpacity>
    </View>}
  </KeyboardAvoidingView>;
}
