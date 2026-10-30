
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api, { apiError } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";
import { styles, ThemeToggle } from "../components/common";

const filters = ["For You", "Remote", "Full-time", "UI/UX"];

const titleCase = (value) =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatSalary = (job) => {
  const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${money(job.salaryMin)} - ${money(job.salaryMax)}`;
  }
  if (job.salaryMin != null) return `From ${money(job.salaryMin)}`;
  if (job.salaryMax != null) return `Up to ${money(job.salaryMax)}`;
  return "";
};

function JobLogo({ company }) {
  const [failed, setFailed] = useState(false);
  const name = company?.name || "J";

  if (company?.logo && !failed) {
    return (
      <Image
        source={{ uri: company.logo }}
        onError={() => setFailed(true)}
        style={{ width: 43, height: 43, borderRadius: 10 }}
        resizeMode="contain"
      />
    );
  }

  return (
    <View
      style={{
        width: 43,
        height: 43,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.softPrimary,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "900",
          color: colors.primary,
        }}
      >
        {String(name).charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

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
  const { user, isAuthenticated, logout } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState("For You");
  const [savedJobs, setSavedJobs] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [hasSkills, setHasSkills] = useState(null); // null until the first response
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const primary = colors.primary;
  const muted = colors.muted;
  const border = colors.border;
  const textColor = colors.text;
  const cardColor = colors.card;

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
      ...extra,
    });
  };

  // Real recommendations: ranked by the candidate's saved skills on the server.
  // Re-run every time the dashboard gains focus, so changes to the profile
  // skills or to the job listings show up without restarting the app.
  const loadRecommendations = useCallback(async () => {
    if (user?.role !== "jobseeker") {
      setRecLoading(false);
      return;
    }

    try {
      const [jobsResponse, favoritesResponse] = await Promise.all([
        api.get("/jobs/recommended", { params: { limit: 10 } }),
        api.get("/favorites").catch(() => null),
      ]);

      setRecommended(jobsResponse.data?.jobs || []);
      setHasSkills(jobsResponse.data?.hasSkills !== false);
      setRecError("");

      if (favoritesResponse?.data?.favorites) {
        setSavedJobs(
          favoritesResponse.data.favorites.map((job) => String(job._id))
        );
      }
    } catch (error) {
      setRecError(apiError(error, "Unable to load recommended jobs."));
    } finally {
      setRecLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadRecommendations();
    }, [loadRecommendations])
  );

  const toggleSaved = async (job) => {
    const id = String(job._id);
    const wasSaved = savedJobs.includes(id);

    // Optimistic update, rolled back if the server rejects it.
    setSavedJobs((previous) =>
      wasSaved ? previous.filter((item) => item !== id) : [...previous, id]
    );

    try {
      if (wasSaved) await api.delete(`/favorites/${id}`);
      else await api.post(`/favorites/${id}`);
    } catch {
      setSavedJobs((previous) =>
        wasSaved ? [...previous, id] : previous.filter((item) => item !== id)
      );
    }
  };

  const openJob = (job) => {
    navigation.navigate("JobDetails", { id: job._id, job });
  };

  const filteredJobs = recommended.filter((job) => {
    if (activeFilter === "Remote") {
      return job.workMode === "remote";
    }

    if (activeFilter === "Full-time") {
      return job.jobType === "full-time";
    }

    if (activeFilter === "UI/UX") {
      return /designer|design|ui|ux/i.test(
        `${job.title} ${(job.skills || []).join(" ")}`
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRecommendations();
            }}
            colors={[primary]}
            tintColor={primary}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 22,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
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
              gap: 12,
            }}
          >
            <ThemeToggle compact />

            <TouchableOpacity
              onPress={() =>
                isAuthenticated
                  ? openDashboard()
                  : navigateRoot("Login")
              }
              accessibilityLabel="Notifications or account"
              style={{ padding: 5 }}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={textColor}
              />
            </TouchableOpacity>
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
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => searchJobs()}
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
            <TouchableOpacity onPress={() => setKeyword("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={muted}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

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
                  backgroundColor: selected ? primary : cardColor,
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
          <Text style={headingStyle}>Recommended Jobs for You</Text>

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

        {recLoading ? (
          <View style={{ ...cardStyle, alignItems: "center", padding: 24, marginBottom: 15 }}>
            <ActivityIndicator size="small" color={primary} />
            <Text style={[smallText, { marginTop: 8 }]}>
              Finding jobs that match your skills...
            </Text>
          </View>
        ) : recError ? (
          <View style={{ ...cardStyle, alignItems: "center", padding: 24, marginBottom: 15 }}>
            <Ionicons name="cloud-offline-outline" size={28} color={muted} />
            <Text
              style={{ color: textColor, fontWeight: "700", marginTop: 8, textAlign: "center" }}
            >
              {recError}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setRecLoading(true);
                loadRecommendations();
              }}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: primary, fontWeight: "800", fontSize: 13 }}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : hasSkills === false ? (
          <View style={{ ...cardStyle, alignItems: "center", padding: 24, marginBottom: 15 }}>
            <Ionicons name="sparkles-outline" size={28} color={primary} />
            <Text
              style={{ color: textColor, fontWeight: "800", marginTop: 8, textAlign: "center" }}
            >
              Complete your profile to get recommendations
            </Text>
            <Text
              style={{ color: muted, fontSize: 12, marginTop: 5, textAlign: "center", lineHeight: 18 }}
            >
              Add your skills and we will show jobs that match them.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              style={{
                marginTop: 12,
                backgroundColor: primary,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>
                Add your skills
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!recLoading && !recError && hasSkills
          ? filteredJobs.map((job) => {
              const salary = formatSalary(job);
              const saved = savedJobs.includes(String(job._id));

              return (
                <TouchableOpacity
                  key={String(job._id)}
                  activeOpacity={0.9}
                  onPress={() => openJob(job)}
                  style={{
                    ...cardStyle,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <JobLogo company={job.company} />

                  <View
                    style={{
                      flex: 1,
                      minWidth: 0,
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
                      numberOfLines={1}
                      style={{
                        color: textColor,
                        fontSize: 11,
                        fontWeight: "600",
                        marginBottom: 3,
                      }}
                    >
                      {job.company?.name || "Company"}
                      {job.location ? ` · ${job.location}` : ""}
                    </Text>

                    <Text style={[smallText, { marginBottom: salary ? 5 : 6 }]}>
                      {titleCase(job.jobType)} · {titleCase(job.workMode)}
                    </Text>

                    {salary ? (
                      <Text
                        style={{
                          color: textColor,
                          fontSize: 12,
                          fontWeight: "800",
                          marginBottom: 6,
                        }}
                      >
                        {salary}
                      </Text>
                    ) : null}

                    {job.matchReason ? (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="checkmark-circle" size={14} color={primary} />
                        <Text
                          numberOfLines={2}
                          style={{
                            flex: 1,
                            marginLeft: 5,
                            color: primary,
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {job.matchReason}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={() => toggleSaved(job)}
                    accessibilityLabel={saved ? "Remove saved job" : "Save job"}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name={saved ? "bookmark" : "bookmark-outline"}
                      size={20}
                      color={textColor}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          : null}

        {!recLoading && !recError && hasSkills && recommended.length === 0 && (
          <View
            style={{
              ...cardStyle,
              alignItems: "center",
              padding: 24,
              marginBottom: 15,
            }}
          >
            <Ionicons name="search-outline" size={28} color={muted} />
            <Text
              style={{
                color: textColor,
                fontWeight: "700",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              No matching jobs right now
            </Text>
            <Text
              style={{
                color: muted,
                fontSize: 12,
                marginTop: 5,
                textAlign: "center",
              }}
            >
              New matches appear as jobs are posted. You can also explore all jobs.
            </Text>
          </View>
        )}

        {!recLoading &&
          !recError &&
          hasSkills &&
          recommended.length > 0 &&
          filteredJobs.length === 0 && (
            <View
              style={{
                ...cardStyle,
                alignItems: "center",
                padding: 24,
                marginBottom: 15,
              }}
            >
              <Ionicons name="search-outline" size={28} color={muted} />
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
