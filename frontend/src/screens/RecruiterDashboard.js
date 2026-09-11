import React,{useEffect,useState}from"react";
import{ScrollView,Text,View,TouchableOpacity}from"react-native";
import api from"../services/api";
import{useAuth}from"../context/AuthContext";
import{styles,Header,Loader}from"../components/common";
import{colors}from"../theme/theme";

const Action=({title,text,onPress,primary=false})=><TouchableOpacity onPress={onPress} style={[styles.card,{marginBottom:10,borderColor:primary?colors.primary:colors.border}]}>
  <Text style={{fontWeight:"900",fontSize:16,color:colors.text}}>{title}</Text>
  <Text style={{color:colors.muted,fontSize:13,lineHeight:19,marginTop:4}}>{text}</Text>
</TouchableOpacity>;

export default function RecruiterDashboard({navigation}) {
  const{user,logout}=useAuth();
  const[d,setD]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{try{const r=await api.get("/recruiter/dashboard");setD(r.data)}catch{}finally{setLoading(false)}})()},[]);
  if(loading)return <Loader/>;
  const s=d?.statistics||d?.stats||{};
  const access=d?.resumeAccess||{};
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Header eyebrow="Recruiter Dashboard" title={`Welcome, ${d?.recruiter?.name||user?.name||"Recruiter"}`} subtitle="Manage your hiring pipeline from one place."/>
    <View style={{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between"}}>
      {[["Active jobs",s.activeJobs],["Applications",s.totalApplications||s.applications],["Interviews",s.interviews],["Hired",s.hired]].map(([x,n])=>
        <View style={[styles.card,{width:"48%"}]} key={x}><Text style={{fontSize:28,fontWeight:"900",color:colors.primary}}>{n||0}</Text><Text style={styles.muted}>{x}</Text></View>)}
    </View>
    <View style={[styles.card,{backgroundColor:"#eff6ff",borderColor:"#bfdbfe",marginTop:2}]}>
      <Text style={{fontSize:16,fontWeight:"900",color:colors.text}}>Candidate Resume Downloads</Text>
      <Text style={{color:colors.muted,lineHeight:20,marginTop:5}}>You receive {access.freeDownloadsTotal||10} free candidate CV unlocks every month. After those are used, paid credits are used.</Text>
      <View style={{flexDirection:"row",gap:10,marginTop:12}}>
        <View style={{backgroundColor:"#fff",padding:10,borderRadius:12,flex:1}}><Text style={{fontSize:11,color:colors.muted}}>Free remaining</Text><Text style={{fontSize:20,fontWeight:"900",color:colors.primary}}>{access.freeDownloadsRemaining??10}/{access.freeDownloadsTotal||10}</Text></View>
        <View style={{backgroundColor:"#fff",padding:10,borderRadius:12,flex:1}}><Text style={{fontSize:11,color:colors.muted}}>Paid credits</Text><Text style={{fontSize:20,fontWeight:"900"}}>{access.credits??0}</Text></View>
      </View>
    </View>
    <Text style={{fontSize:19,fontWeight:"900",color:colors.text,marginTop:8,marginBottom:5}}>Quick Actions</Text>
    <Action primary title="+ Post a New Job" text="Create and publish a new job opening." onPress={()=>navigation.navigate("PostJob")}/>
    <Action title="Manage Jobs" text="View, edit, publish, close and delete your job listings." onPress={()=>navigation.navigate("Jobs")}/>
    <Action title="Search Candidates" text="Search privacy-protected candidates and unlock CVs." onPress={()=>navigation.navigate("Candidates")}/>
    <Action title="Buy CV Credits" text="Purchase additional CV credits securely with Razorpay." onPress={()=>navigation.navigate("CvPackages")}/>
    <Action title="View Applications" text="Review candidates who applied to your jobs." onPress={()=>navigation.navigate("Applications")}/>
    <Action title="Company Manager" text="Manage the company information used on your job listings." onPress={()=>navigation.navigate("CompanyManager")}/>
    <Action title="Recruiter Profile" text="Update your recruiter and company profile." onPress={()=>navigation.navigate("Profile")}/>
    <TouchableOpacity style={styles.outline} onPress={logout}><Text style={styles.outlineText}>Sign out</Text></TouchableOpacity>
  </ScrollView>
}
