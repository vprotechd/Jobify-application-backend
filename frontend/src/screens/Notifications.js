import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api, { apiError } from "../services/api";
import { Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";
import { connectNotificationSocket } from "../services/socket";

const iconFor = (type) => ({
  application: "document-text-outline",
  application_status: "checkmark-circle-outline",
  payment: "card-outline",
  job: "briefcase-outline",
}[type] || "notifications-outline");

export default function Notifications({ navigation }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const r = await api.get("/notifications?limit=100");
      setItems(Array.isArray(r.data?.notifications) ? r.data.notifications : []);
      setUnread(Number(r.data?.unreadCount || 0));
    } catch (e) {
      // Notification center remains stable even if the API is temporarily unavailable.
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    load();
    let active = true;
    (async () => {
      await connectNotificationSocket((item) => {
        if (!active || !item) return;
        setItems(prev => [item, ...prev.filter(x => x._id !== item._id)]);
        if (!item.read) setUnread(prev => prev + 1);
      });
    })();
    return () => { active = false; };
  }, [load]));

  const markRead = async (item) => {
    try {
      if (!item.read) {
        await api.patch(`/notifications/${item._id}/read`);
        setItems(prev => prev.map(x => x._id === item._id ? { ...x, read: true } : x));
        setUnread(prev => Math.max(0, prev - 1));
      }
      if (item.link) {
        const routes = ["CandidateApplications","RecruiterApplications","CvPackages","Jobs","Candidates","AdminMenu"];
        if (routes.includes(item.link)) navigation.navigate(item.link);
      }
    } catch (e) {}
  };

  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems(prev => prev.map(x => ({ ...x, read: true })));
      setUnread(0);
    } catch (e) {}
  };

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
    <Header eyebrow="Jobify" title="Notifications" subtitle="Stay updated about applications, jobs and payments." />
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <Text style={{ fontWeight: "800", color: colors.text }}>{unread} unread</Text>
      {unread > 0 ? <TouchableOpacity onPress={markAll}><Text style={{ color: colors.primary, fontWeight: "800" }}>Mark all as read</Text></TouchableOpacity> : null}
    </View>
    {loading ? <Loader /> : items.length === 0 ? <View style={[styles.card,{alignItems:"center",paddingVertical:40}]}><Ionicons name="notifications-off-outline" size={38} color="#94a3b8"/><Text style={{marginTop:10,fontWeight:"800",color:colors.text}}>You're all caught up</Text><Text style={[styles.muted,{marginTop:5,textAlign:"center"}]}>New activity will appear here.</Text></View> :
      items.map(item => <TouchableOpacity key={item._id} onPress={() => markRead(item)}
        style={[styles.card,{borderColor:item.read?colors.border:colors.primary,backgroundColor:item.read?"#fff":"#eff6ff"}]}>
        <View style={{flexDirection:"row",gap:12}}>
          <View style={{width:42,height:42,borderRadius:12,backgroundColor:"#fff",alignItems:"center",justifyContent:"center"}}>
            <Ionicons name={iconFor(item.type)} size={21} color={colors.primary}/>
          </View>
          <View style={{flex:1}}>
            <View style={{flexDirection:"row",justifyContent:"space-between",gap:8}}>
              <Text style={{fontWeight:"900",color:colors.text,flex:1}}>{item.title}</Text>
              {!item.read ? <View style={{width:8,height:8,borderRadius:4,backgroundColor:colors.primary,marginTop:6}}/> : null}
            </View>
            <Text style={{color:colors.muted,lineHeight:20,marginTop:5}}>{item.message}</Text>
            <Text style={{fontSize:11,color:"#94a3b8",marginTop:8}}>{item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}</Text>
          </View>
        </View>
      </TouchableOpacity>)
    }
  </ScrollView>;
}
