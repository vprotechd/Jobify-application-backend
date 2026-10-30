
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
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

const filters = ["For You", "Remote", "Full-time", "UI/UX"];

const recommendedJobs = [
  {
    id: "1",
    title: "Product Designer",
    company: "Google",
    location: "Bengaluru, India",
    type: "Full-time",
    workplace: "Remote",
    salary: "₹18–28 LPA",
    logo: "google",
  },
  {
    id: "2",
    title: "UI/UX Designer",
    company: "Microsoft",
    location: "Noida, India",
    type: "Full-time",
    workplace: "Hybrid",
    salary: "₹15–22 LPA",
    logo: "microsoft",
  },
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
  const { mode } = useTheme();
  const { user, isAuthenticated } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState("For You");
  const [savedJobs, setSavedJobs] = useState([]);

  const primary = colors.primary;
  const muted = colors.muted;
  const border = colors.border;
  const textColor = colors.text;
  const cardColor = colors.card;

  const root = () => navigation.getParent();

  const navigateRoot = (screen, params) => {
    const parent = root();

    if (parent) {
      parent.navigate(screen, params);
    } else {
      navigation.navigate(screen, params);
    }
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
      ...extra,
    });
  };

  const toggleSaved = (job) => {
    setSavedJobs((previous) =>
      previous.includes(job.id)
        ? previous.filter((id) => id !== job.id)
        : [...previous, job.id]
    );
  };

  const filteredJobs = recommendedJobs.filter((job) => {
    if (activeFilter === "Remote") {
      return job.workplace === "Remote";
    }

    if (activeFilter === "Full-time") {
      return job.type === "Full-time";
    }

    if (activeFilter === "UI/UX") {
      return /designer|design|ui|ux/i.test(
        `${job.title} ${job.company}`
      );
    }

    return true;
  });

  const cardStyle = {
    backgroundColor: cardColor,
    borderColor: border,
    borderWidth: 1,
    borderRadius: 15,
  };

  const headingStyle = {
    color: textColor,
    fontSize: 17,
    fontWeight: "800",
  };

  const smallText = {
    color: muted,
    fontSize: 12,
  };

  const renderCompanyLogo = (job) => {
    if (job.logo === "google") {
      return (
        <View
          style={{
            width: 43,
            height: 43,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 30,
              fontWeight: "900",
              color: "#4285F4",
            }}
          >
            G
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          width: 43,
          height: 43,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 2,
          padding: 3,
        }}
      >
        {["#F25022", "#7FBA00", "#00A4EF", "#FFB900"].map(
          (logoColor, index) => (
            <View
              key={index}
              style={{
                width: 16,
                height: 16,
                backgroundColor: logoColor,
              }}
            />
          )
        )}
      </View>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <StatusBar
        barStyle={
          mode === "dark" ? "light-content" : "dark-content"
        }
        backgroundColor={colors.background}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: 30 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
       {/* Header */}
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 45,
    marginBottom: 22,
    gap: 8,
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
                width: 31,
                height: 31,
                marginRight: 5,
              }}
              resizeMode="contain"
            />

            <Text
              style={{
                color: primary,
                fontSize: 22,
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
              gap: 10,
            }}
          >
            <ThemeToggle compact />

            {isAuthenticated ? (
              <TouchableOpacity
                onPress={openDashboard}
                accessibilityLabel="Open account"
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 9,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={primary}
                />

                <Text
                  style={{
                    color: primary,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  Account
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => navigateRoot("Login")}
                  accessibilityLabel="Sign in"
                  style={{ paddingVertical: 8 }}
                >
                  <Text
                    style={{
                      color: primary,
                      fontSize: 13,
                      fontWeight: "800",
                    }}
                  >
                    Sign in
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateRoot("Register")}
                  activeOpacity={0.8}
                  accessibilityLabel="Register"
                  style={{
                    backgroundColor: primary,
                    borderRadius: 9,
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    Register
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Personalized greeting */}
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontSize: 19,
              fontWeight: "800",
              color: textColor,
            }}
          >
            Good Morning, {user?.name?.split(" ")[0] || "there"} 
          </Text>

          <Text
            style={{
              color: muted,
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Let's find your next opportunity
          </Text>
        </View>

        {/* Search bar */}
        <View
          style={{
            ...cardStyle,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 13,
            height: 47,
            marginBottom: 15,
          }}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={muted}
          />

          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={() => searchJobs()}
            placeholder="Search jobs, companies, skills..."
            placeholderTextColor={muted}
            returnKeyType="search"
            style={{
              flex: 1,
              color: textColor,
              fontSize: 13,
              paddingHorizontal: 10,
              height: "100%",
            }}
          />

          {keyword.length > 0 && (
            <TouchableOpacity
              onPress={() => setKeyword("")}
              accessibilityLabel="Clear search"
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={muted}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => searchJobs()}
            accessibilityLabel="Search jobs"
          >
            <Ionicons
              name="arrow-forward-circle"
              size={24}
              color={primary}
            />
          </TouchableOpacity>
        </View>

        {/* Job filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 9,
            paddingBottom: 4,
          }}
          style={{ marginBottom: 20 }}
        >
          {filters.map((filter) => {
            const selected = activeFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: selected
                    ? primary
                    : cardColor,
                  borderColor: selected ? primary : border,
                  borderWidth: 1,
                  borderRadius: 22,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                }}
              >
                <Text
                  style={{
                    color: selected ? "#FFFFFF" : textColor,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recommended jobs */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 11,
          }}
        >
          <Text style={headingStyle}>Recommended for You</Text>

          <TouchableOpacity onPress={() => searchJobs()}>
            <Text
              style={{
                color: primary,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              See All
            </Text>
          </TouchableOpacity>
        </View>

        {filteredJobs.map((job) => (
          <TouchableOpacity
            key={job.id}
            activeOpacity={0.9}
            onPress={() =>
              searchJobs({
                keyword: job.title,
                company: job.company,
              })
            }
            style={{
              ...cardStyle,
              flexDirection: "row",
              alignItems: "flex-start",
              padding: 12,
              marginBottom: 10,
            }}
          >
            {renderCompanyLogo(job)}

            <View
              style={{
                flex: 1,
                marginLeft: 10,
                paddingTop: 2,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: textColor,
                  fontSize: 13,
                  fontWeight: "800",
                  marginBottom: 4,
                }}
              >
                {job.title}
              </Text>

              <Text
                style={{
                  color: textColor,
                  fontSize: 11,
                  fontWeight: "600",
                  marginBottom: 3,
                }}
              >
                {job.company} · {job.location}
              </Text>

              <Text style={[smallText, { marginBottom: 5 }]}>
                {job.type} · {job.workplace}
              </Text>

              <Text
                style={{
                  color: textColor,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {job.salary}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => toggleSaved(job)}
              accessibilityLabel={
                savedJobs.includes(job.id)
                  ? "Remove saved job"
                  : "Save job"
              }
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <Ionicons
                name={
                  savedJobs.includes(job.id)
                    ? "bookmark"
                    : "bookmark-outline"
                }
                size={20}
                color={textColor}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {filteredJobs.length === 0 && (
          <View
            style={{
              ...cardStyle,
              alignItems: "center",
              padding: 24,
              marginBottom: 15,
            }}
          >
            <Ionicons
              name="search-outline"
              size={28}
              color={muted}
            />

            <Text
              style={{
                color: textColor,
                fontWeight: "700",
                marginTop: 8,
              }}
            >
              No recommendations for this filter
            </Text>

            <Text
              style={{
                color: muted,
                fontSize: 12,
                marginTop: 5,
                textAlign: "center",
              }}
            >
              Try another filter or explore all jobs.
            </Text>
          </View>
        )}

        {/* Explore jobs */}
        <View style={{ marginTop: 15, marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={headingStyle}>Explore jobs</Text>

            <TouchableOpacity onPress={() => searchJobs()}>
              <Text
                style={{
                  color: primary,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                View All →
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {categories.map((item) => (
              <TouchableOpacity
                key={item.title}
                onPress={() =>
                  searchJobs({ category: item.title })
                }
                style={{
                  ...cardStyle,
                  width: "48%",
                  flexGrow: 1,
                  flexBasis: "42%",
                  padding: 13,
                  minHeight: 90,
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={23}
                  color={primary}
                />

                <Text
                  style={{
                    color: textColor,
                    fontSize: 12,
                    fontWeight: "700",
                    marginTop: 9,
                  }}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Candidate account */}
        <View
          style={{
            ...cardStyle,
            padding: 15,
            marginBottom: 12,
          }}
        >
          <Text style={headingStyle}>Make your next move</Text>

          <Text
            style={{
              color: muted,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 5,
            }}
          >
            Create your profile and manage your job applications
            from one place.
          </Text>

          <TouchableOpacity
            onPress={() =>
              isAuthenticated
                ? openDashboard()
                : navigateRoot("Register")
            }
            style={{ marginTop: 12, alignSelf: "flex-start" }}
          >
            <Text
              style={{
                color: primary,
                fontWeight: "800",
                fontSize: 13,
              }}
            >
              {isAuthenticated
                ? "Open dashboard →"
                : "Create your account →"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recruiter account */}
        <View
          style={{
            ...cardStyle,
            padding: 15,
            marginBottom: 15,
          }}
        >
          <Text style={headingStyle}>Hiring for your company?</Text>

          <Text
            style={{
              color: muted,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 5,
            }}
          >
            Connect with candidates and find talent for your team.
          </Text>

          <TouchableOpacity
            onPress={() => navigateRoot("Register")}
            style={{ marginTop: 12, alignSelf: "flex-start" }}
          >
            <Text
              style={{
                color: primary,
                fontSize: 13,
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
            paddingTop: 15,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: muted,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            © Jobify · Find opportunities. Build your future.
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 22,
              marginTop: 12,
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
    </View>
  );
}
