
// import { useTheme } from "../context/ThemeContext";
// import React, { useState } from "react";
// import {
//   Image,
//   ScrollView,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useAuth } from "../context/AuthContext";
// import { colors } from "../theme/theme";
// import { styles, ThemeToggle } from "../components/common";

// const popular = [
//   "React Developer",
//   "Software Engineer",
//   "Marketing Manager",
//   "Data Analyst",
//   "Product Manager",
// ];

// const categories = [
//   "Software Development",
//   "Marketing",
//   "Finance",
//   "Human Resources",
//   "Sales",
//   "Design",
//   "Healthcare",
//   "Engineering",
// ];

// export default function Home({ navigation }) {
//   const { mode: __themeMode } = useTheme();
//   const { user, isAuthenticated, logout } = useAuth();

//   const [k, setK] = useState("");
//   const [loc, setLoc] = useState("");

//   const root = () => navigation.getParent();

//   const dash = () =>
//     root()?.navigate(
//       user?.role === "admin"
//         ? "Admin"
//         : user?.role === "recruiter"
//         ? "Recruiter"
//         : "Candidate"
//     );

//   return (
//     <ScrollView
//       style={styles.screen}
//       contentContainerStyle={styles.content}
//       keyboardShouldPersistTaps="handled"
//     >
//       {/* Header */}
//       <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           justifyContent: "space-between",
//           marginTop: 25,
//           marginBottom: 24,
//         }}
//       >
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             flexShrink: 1,
//           }}
//         >
//           <Image
//             source={require("../../assets/jobify.png")}
//             style={{
//               width: 40,
//               height: 40,
//               borderRadius: 10,
//               marginRight: 9,
//             }}
//           />

//           <Text
//             style={{
//               fontSize: 22,
//               fontWeight: "900",
//               color: colors.text,
//             }}
//           >
//             Jobify
//           </Text>
//         </View>

//         <View
//           style={{
//             flexDirection: "row",
//             gap: 7,
//             alignItems: "center",
//           }}
//         >
//           <ThemeToggle compact />

//           {isAuthenticated ? (
//             <View
//               style={{
//                 flexDirection: "row",
//                 gap: 7,
//                 alignItems: "center",
//               }}
//             >
//               <TouchableOpacity
//                 style={styles.outline}
//                 onPress={dash}
//               >
//                 <Text style={styles.outlineText}>
//                   Dashboard
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   styles.outline,
//                   { borderColor: "#fecaca" },
//                 ]}
//                 onPress={logout}
//               >
//                 <Ionicons
//                   name="log-out-outline"
//                   size={18}
//                   color={colors.danger}
//                 />
//               </TouchableOpacity>
//             </View>
//           ) : (
//             <View
//               style={{
//                 flexDirection: "row",
//                 gap: 7,
//                 alignItems: "center",
//               }}
//             >
//               <TouchableOpacity
//                 onPress={() => root()?.navigate("Login")}
//                 style={{ padding: 10 }}
//               >
//                 <Text
//                   style={{
//                     fontWeight: "800",
//                     color: colors.text,
//                   }}
//                 >
//                   Login
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 onPress={() => root()?.navigate("Register")}
//                 style={{
//                   backgroundColor: colors.primary,
//                   borderRadius: 10,
//                   paddingHorizontal: 13,
//                   paddingVertical: 10,
//                 }}
//               >
//                 <Text
//                   style={{
//                     color: "#fff",
//                     fontWeight: "800",
//                   }}
//                 >
//                   Get Started
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>
//       </View>

//       {/* Hero section */}
//       <Text
//         style={{
//           fontSize: 12,
//           color: colors.primary,
//           fontWeight: "900",
//           letterSpacing: 0.5,
//         }}
//       >
//         ✦ FIND OPPORTUNITIES THAT MATCH YOUR POTENTIAL
//       </Text>

//       <Text
//         style={{
//           fontSize: 37,
//           lineHeight: 44,
//           fontWeight: "900",
//           color: colors.text,
//           marginTop: 12,
//         }}
//       >
//         Find your next{" "}
//         <Text style={{ color: colors.primary }}>
//           career opportunity
//         </Text>
//       </Text>

//       <Text style={styles.subtitle}>
//         Discover jobs from leading companies, build your
//         professional profile, and take the next step in your
//         career.
//       </Text>

//       {/* Authentication buttons */}
//       {!isAuthenticated && (
//         <View
//           style={{
//             flexDirection: "row",
//             gap: 8,
//           }}
//         >
//           <TouchableOpacity
//             style={[styles.outline, { flex: 1 }]}
//             onPress={() => root()?.navigate("Login")}
//           >
//             <Text style={styles.outlineText}>
//               Sign In
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[styles.button, { flex: 1 }]}
//             onPress={() => root()?.navigate("Register")}
//           >
//             <Text style={styles.buttonText}>
//               Create Account
//             </Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Job search card */}
//       <View
//         style={[
//           styles.card,
//           { marginTop: 10 },
//         ]}
//       >
//         <Text style={styles.label}>
//           Job title, skills or keywords
//         </Text>

//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             borderWidth: 1,
//             borderColor: colors.border,
//             borderRadius: 12,
//             paddingHorizontal: 12,
//           }}
//         >
//           <Ionicons
//             name="search"
//             size={19}
//             color={colors.muted}
//           />

//           <TextInput
//             style={{
//               flex: 1,
//               padding: 12,
//               color: colors.text,
//             }}
//             value={k}
//             onChangeText={setK}
//             placeholder="Search jobs"
//             placeholderTextColor="#94a3b8"
//             returnKeyType="search"
//             onSubmitEditing={() =>
//               navigation.navigate("Jobs", {
//                 keyword: k,
//                 location: loc,
//               })
//             }
//           />
//         </View>

//         <Text
//           style={[
//             styles.label,
//             { marginTop: 12 },
//           ]}
//         >
//           Location
//         </Text>

//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             borderWidth: 1,
//             borderColor: colors.border,
//             borderRadius: 12,
//             paddingHorizontal: 12,
//           }}
//         >
//           <Ionicons
//             name="location-outline"
//             size={19}
//             color={colors.muted}
//           />

//           <TextInput
//             style={{
//               flex: 1,
//               padding: 12,
//               color: colors.text,
//             }}
//             value={loc}
//             onChangeText={setLoc}
//             placeholder="Location"
//             placeholderTextColor="#94a3b8"
//             returnKeyType="search"
//             onSubmitEditing={() =>
//               navigation.navigate("Jobs", {
//                 keyword: k,
//                 location: loc,
//               })
//             }
//           />
//         </View>

//         <TouchableOpacity
//           style={[
//             styles.button,
//             { marginTop: 12 },
//           ]}
//           onPress={() =>
//             navigation.navigate("Jobs", {
//               keyword: k,
//               location: loc,
//             })
//           }
//         >
//           <Text style={styles.buttonText}>
//             Search Jobs
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Popular searches */}
//       <Text
//         style={{
//           fontSize: 21,
//           fontWeight: "800",
//           color: colors.text,
//           marginVertical: 8,
//         }}
//       >
//         Popular searches
//       </Text>

//       <View
//         style={{
//           flexDirection: "row",
//           flexWrap: "wrap",
//           gap: 8,
//         }}
//       >
//         {popular.map((x) => (
//           <TouchableOpacity
//             key={x}
//             style={[
//               styles.chip,
//               {
//                 borderWidth: 1,
//                 borderColor: colors.border,
//                 backgroundColor: colors.card,
//               },
//             ]}
//             onPress={() =>
//               navigation.navigate("Jobs", {
//                 keyword: x,
//               })
//             }
//           >
//             <Text
//               style={{
//                 color: colors.text,
//                 fontWeight: "700",
//               }}
//             >
//               {x}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       {/* Popular job categories */}
//       <View
//         style={{
//           flexDirection: "row",
//           justifyContent: "space-between",
//           alignItems: "flex-end",
//           marginTop: 24,
//           marginBottom: 10,
//         }}
//       >
//         <View style={{ flexShrink: 1 }}>
//           <Text
//             style={{
//               fontSize: 21,
//               fontWeight: "800",
//               color: colors.text,
//             }}
//           >
//             Popular job categories
//           </Text>

//           <Text style={styles.muted}>
//             Explore roles across industries.
//           </Text>
//         </View>

//         <TouchableOpacity
//           onPress={() => navigation.navigate("Jobs")}
//         >
//           <Text
//             style={{
//               color: colors.primary,
//               fontWeight: "800",
//             }}
//           >
//             View all →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {categories.map((x) => (
//         <TouchableOpacity
//           key={x}
//           style={styles.card}
//           onPress={() =>
//             navigation.navigate("Jobs", {
//               category: x,
//             })
//           }
//         >
//           <View style={styles.row}>
//             <View>
//               <Text
//                 style={{
//                   fontWeight: "800",
//                   color: colors.text,
//                 }}
//               >
//                 {x}
//               </Text>

//               <Text
//                 style={[
//                   styles.muted,
//                   { marginTop: 4 },
//                 ]}
//               >
//                 Explore jobs
//               </Text>
//             </View>

//             <Ionicons
//               name="arrow-forward"
//               color={colors.primary}
//             />
//           </View>
//         </TouchableOpacity>
//       ))}

//       {/* About Jobify */}
//       <View
//         style={[
//           styles.card,
//           { marginTop: 6 },
//         ]}
//       >
//         <Text
//           style={{
//             fontSize: 21,
//             fontWeight: "800",
//             color: colors.text,
//           }}
//         >
//           Everything you need to move your career forward
//         </Text>

//         <Text
//           style={[
//             styles.muted,
//             {
//               marginTop: 8,
//               lineHeight: 22,
//             },
//           ]}
//         >
//           Build your profile, discover opportunities, track
//           applications and connect with employers.
//         </Text>

//         <TouchableOpacity
//           style={[
//             styles.outline,
//             { marginTop: 25 },
//           ]}
//           onPress={() => root()?.navigate("About")}
//         >
//           <Text style={styles.outlineText}>
//             Learn more about Jobify
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.outline}
//           onPress={() => root()?.navigate("Contact")}
//         >
//           <Text style={styles.outlineText}>
//             Contact support
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// }





import React, { useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";
import { styles, ThemeToggle } from "../components/common";

const popular = [
  "Remote",
  "React Developer",
  "Software Engineer",
  "Data Analyst",
  "Internship",
];

const categories = [
  { title: "Software Development", icon: "code-slash-outline" },
  { title: "Marketing", icon: "megaphone-outline" },
  { title: "Finance", icon: "cash-outline" },
  { title: "Human Resources", icon: "people-outline" },
  { title: "Sales", icon: "trending-up-outline" },
  { title: "Design", icon: "color-palette-outline" },
  { title: "Healthcare", icon: "medkit-outline" },
  { title: "Engineering", icon: "construct-outline" },
];

export default function Home({ navigation }) {
  const { mode: __themeMode } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const root = () => navigation.getParent();

  const navigateRoot = (screen, params) => {
    root()?.navigate(screen, params);
  };

  const openDashboard = () => {
    navigateRoot(
      user?.role === "admin"
        ? "Admin"
        : user?.role === "recruiter"
        ? "Recruiter"
        : "Candidate"
    );
  };

  const searchJobs = (extra = {}) => {
    navigation.navigate("Jobs", {
      keyword: keyword.trim(),
      location: location.trim(),
      ...extra,
    });
  };

  const muted = colors.muted;
  const border = colors.border;
  const primary = colors.primary;

  const sectionTitle = {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
  };

  const smallLabel = {
    color: muted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  };

  const searchInput = {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 9,
    color: colors.text,
    fontSize: 15,
    outlineStyle: "none",
  };

  const outlineCard = {
    backgroundColor: colors.card,
    borderColor: border,
    borderWidth: 1,
    borderRadius: 12,
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 35 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Compact header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          marginBottom: 23,
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexShrink: 1,
          }}
        >
          <Image
            source={require("../../assets/jobify.png")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              marginRight: 8,
            }}
            resizeMode="contain"
          />

          <Text
            style={{
              color: primary,
              fontSize: 23,
              fontWeight: "900",
              letterSpacing: -0.7,
            }}
          >
            Jobify
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
          }}
        >
          <ThemeToggle compact />

          {isAuthenticated ? (
            <>
              <TouchableOpacity
                onPress={openDashboard}
                style={{
                  padding: 8,
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 10,
                }}
              >
                <Ionicons
                  name="person-outline"
                  size={21}
                  color={colors.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={logout}
                accessibilityLabel="Log out"
                style={{ padding: 6 }}
              >
                <Ionicons
                  name="log-out-outline"
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => navigateRoot("Login")}
              style={{ paddingVertical: 9, paddingHorizontal: 4 }}
            >
              <Text
                style={{
                  color: primary,
                  fontWeight: "800",
                  fontSize: 14,
                }}
              >
                Sign in
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Indeed-inspired search-first heading */}
      <View style={{ marginBottom: 21 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 31,
            lineHeight: 38,
            fontWeight: "900",
            letterSpacing: -0.8,
          }}
        >
          Find your next{"\n"}
          <Text style={{ color: primary }}>opportunity</Text>
        </Text>

        <Text
          style={{
            color: muted,
            fontSize: 15,
            lineHeight: 22,
            marginTop: 9,
          }}
        >
          Search jobs, explore companies, and take the next
          step in your career.
        </Text>
      </View>

      {/* Main job search panel */}
      <View
        style={{
          ...outlineCard,
          padding: 15,
          marginBottom: 23,
        }}
      >
        <Text style={smallLabel}>What</Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: border,
            borderRadius: 9,
            paddingHorizontal: 10,
            marginBottom: 15,
          }}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={muted}
          />

          <TextInput
            style={searchInput}
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Job title, keywords, or company"
            placeholderTextColor={muted}
            returnKeyType="next"
            accessibilityLabel="Job title, keywords, or company"
          />
          {keyword.length > 0 && (
            <TouchableOpacity
              onPress={() => setKeyword("")}
              accessibilityLabel="Clear job search"
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={muted}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={smallLabel}>Where</Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: border,
            borderRadius: 9,
            paddingHorizontal: 10,
            marginBottom: 15,
          }}
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={muted}
          />

          <TextInput
            style={searchInput}
            value={location}
            onChangeText={setLocation}
            placeholder="City, state, or remote"
            placeholderTextColor={muted}
            returnKeyType="search"
            onSubmitEditing={() => searchJobs()}
            accessibilityLabel="Job location"
          />

          {location.length > 0 && (
            <TouchableOpacity
              onPress={() => setLocation("")}
              accessibilityLabel="Clear location"
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={muted}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => searchJobs()}
          activeOpacity={0.85}
          style={{
            backgroundColor: primary,
            borderRadius: 9,
            minHeight: 49,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Ionicons name="search" size={19} color="#FFFFFF" />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: "800",
            }}
          >
            Find jobs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Popular searches */}
      <View style={{ marginBottom: 27 }}>
        <Text style={[sectionTitle, { marginBottom: 12 }]}>
          Popular searches
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 9, paddingBottom: 3 }}
        >
          {popular.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => searchJobs({ keyword: item })}
              style={{
                borderWidth: 1,
                borderColor: border,
                borderRadius: 22,
                paddingVertical: 10,
                paddingHorizontal: 15,
                backgroundColor: colors.card,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Job categories */}
      <View style={{ marginBottom: 27 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={sectionTitle}>Explore jobs</Text>
            <Text
              style={{
                color: muted,
                fontSize: 13,
                marginTop: 5,
              }}
            >
              Find roles that match your interests.
            </Text>
          </View>

          <TouchableOpacity onPress={() => searchJobs()}>
            <Text
              style={{
                color: primary,
                fontWeight: "800",
                fontSize: 13,
              }}
            >
              View all →
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 11,
          }}
        >
          {categories.map((item) => (
            <TouchableOpacity
              key={item.title}
              onPress={() =>
                searchJobs({ category: item.title })
              }
              activeOpacity={0.8}
              style={{
                ...outlineCard,
                width: "48%",
                flexGrow: 1,
                flexBasis: "42%",
                minHeight: 115,
                padding: 14,
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: `${primary}18`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={primary}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 4,
                  marginTop: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: "800",
                    flex: 1,
                  }}
                >
                  {item.title}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={primary}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Candidate and employer links */}
      <View
        style={{
          ...outlineCard,
          padding: 17,
          marginBottom: 16,
        }}
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
              width: 43,
              height: 43,
              borderRadius: 11,
              backgroundColor: `${primary}18`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="person-outline"
              size={23}
              color={primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: "800",
              }}
            >
              Make your next move
            </Text>

            <Text
              style={{
                color: muted,
                fontSize: 14,
                lineHeight: 21,
                marginTop: 5,
              }}
            >
              Create your profile and manage your job
              applications from one place.
            </Text>

            <TouchableOpacity
              onPress={() =>
                isAuthenticated
                  ? openDashboard()
                  : navigateRoot("Register")
              }
              style={{
                alignSelf: "flex-start",
                marginTop: 14,
                borderWidth: 1,
                borderColor: primary,
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  color: primary,
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                {isAuthenticated
                  ? "Open dashboard"
                  : "Create your account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View
        style={{
          ...outlineCard,
          padding: 17,
          marginBottom: 18,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
            fontWeight: "800",
          }}
        >
          Hiring for your company?
        </Text>

        <Text
          style={{
            color: muted,
            fontSize: 14,
            lineHeight: 21,
            marginTop: 6,
          }}
        >
          Connect with candidates and find talent for your
          team.
        </Text>

        <TouchableOpacity
          onPress={() => navigateRoot("Register")}
          style={{
            alignSelf: "flex-start",
            marginTop: 13,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              color: primary,
              fontSize: 14,
              fontWeight: "800",
            }}
          >
            Get started with Jobify →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: border,
          paddingTop: 17,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: muted,
            fontSize: 13,
            textAlign: "center",
            lineHeight: 21,
          }}
        >
          © Jobify · Find opportunities. Build your future.
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 20,
            marginTop: 13,
          }}
        >
          <TouchableOpacity
            onPress={() => navigateRoot("About")}
          >
            <Text style={{ color: primary, fontWeight: "700" }}>
              About
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigateRoot("Contact")}
          >
            <Text style={{ color: primary, fontWeight: "700" }}>
              Contact
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
