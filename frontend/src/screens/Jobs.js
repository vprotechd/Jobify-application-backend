
import React, { useCallback, useEffect, useState } from "react";
import {
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

import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import api, { apiError } from "../services/api";
import { colors } from "../theme/theme";

import {
  styles,
  ThemeToggle,
  Loader,
  Empty,
} from "../components/common";

const filters = ["For You", "Remote", "Full-time", "UI/UX"];

const types = [
  "",
  "full-time",
  "part-time",
  "contract",
  "internship",
  "freelance",
];

const modes = ["", "remote", "hybrid", "onsite"];

const categories = [
  {
    title: "Software Development",
    icon: "code-slash-outline",
  },
  {
    title: "Marketing",
    icon: "megaphone-outline",
  },
  {
    title: "Finance",
    icon: "cash-outline",
  },
  {
    title: "Human Resources",
    icon: "people-outline",
  },
  {
    title: "Sales",
    icon: "trending-up-outline",
  },
  {
    title: "Design",
    icon: "color-palette-outline",
  },
  {
    title: "Healthcare",
    icon: "medkit-outline",
  },
  {
    title: "Engineering",
    icon: "construct-outline",
  },
];

export default function Home({ navigation }) {
  const { mode: themeMode } = useTheme();
  const { user, isAuthenticated } = useAuth();

  // --------------------------------------------------
  // SEARCH / FILTER STATE
  // --------------------------------------------------

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const [activeFilter, setActiveFilter] =
    useState("For You");

  const [selectedType, setSelectedType] =
    useState("");

  const [selectedMode, setSelectedMode] =
    useState("");

  // --------------------------------------------------
  // JOB STATE
  // --------------------------------------------------

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [savedJobs, setSavedJobs] =
    useState([]);

  // --------------------------------------------------
  // THEME
  // --------------------------------------------------

  const primary = colors.primary;
  const muted = colors.muted;
  const border = colors.border;
  const textColor = colors.text;
  const cardColor = colors.card;

  // --------------------------------------------------
  // ROOT NAVIGATION
  // --------------------------------------------------

  const root = () => navigation.getParent();

  const navigateRoot = (screen, params) => {
    const parent = root();

    if (parent) {
      parent.navigate(screen, params);
    } else {
      navigation.navigate(screen, params);
    }
  };

  // --------------------------------------------------
  // ACCOUNT DASHBOARD
  // --------------------------------------------------

  const openDashboard = () => {
    navigateRoot(
      user?.role === "admin"
        ? "Admin"
        : user?.role === "recruiter"
        ? "Recruiter"
        : "Candidate"
    );
  };

  // --------------------------------------------------
  // LOAD JOBS
  // --------------------------------------------------

  const loadJobs = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/jobs");

      const receivedJobs =
        response.data?.jobs;

      if (Array.isArray(receivedJobs)) {
        setJobs(receivedJobs);
      } else {
        setJobs([]);
      }
    } catch (err) {
      setError(
        apiError(err) ||
          "Unable to load jobs."
      );

      setJobs([]);
    } finally {
      setLoadingJobs(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const handleRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  // --------------------------------------------------
  // NORMALIZE
  // --------------------------------------------------

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  // --------------------------------------------------
  // FILTER JOBS
  //
  // Same filtering concept as Jobs.js
  // but everything happens directly on Home.
  // --------------------------------------------------

  const filteredJobs = jobs.filter((job) => {
    const query =
      keyword.trim().toLowerCase();

    const locationQuery =
      location.trim().toLowerCase();

    const title =
      normalize(job.title);

    const companyName =
      normalize(
        job.company?.name ||
          job.companyName ||
          job.recruiter?.companyName ||
          job.recruiter?.company?.name
      );

    const description =
      normalize(job.description);

    const jobLocation =
      normalize(job.location);

    const searchSkills =
      Array.isArray(job.skills)
        ? job.skills.map((skill) =>
            normalize(skill)
          )
        : [];

    const jobType =
      normalize(
        job.jobType || job.type
      );

    const workMode =
      normalize(
        job.workMode || job.mode
      ).replace(/[-_\s]/g, "");

    const normalizedSelectedMode =
      selectedMode.replace(
        /[-_\s]/g,
        ""
      );

    // ----------------------------------------------
    // KEYWORD SEARCH
    // ----------------------------------------------

    const matchesSearch =
      !query ||
      title.includes(query) ||
      companyName.includes(query) ||
      description.includes(query) ||
      jobLocation.includes(query) ||
      searchSkills.some((skill) =>
        skill.includes(query)
      );

    // ----------------------------------------------
    // LOCATION SEARCH
    // ----------------------------------------------

    const matchesLocation =
      !locationQuery ||
      jobLocation.includes(
        locationQuery
      );

    // ----------------------------------------------
    // JOB TYPE
    // ----------------------------------------------

    const matchesType =
      !selectedType ||
      jobType ===
        selectedType.toLowerCase();

    // ----------------------------------------------
    // WORK MODE
    // ----------------------------------------------

    const matchesMode =
      !selectedMode ||
      workMode ===
        normalizedSelectedMode;

    // ----------------------------------------------
    // HOME QUICK FILTERS
    // ----------------------------------------------

    if (activeFilter === "Remote") {
      if (!workMode.includes("remote")) {
        return false;
      }
    }

    if (activeFilter === "Full-time") {
      if (!jobType.includes("full-time")) {
        return false;
      }
    }

    if (activeFilter === "UI/UX") {
      const uiUxText = `
        ${title}
        ${companyName}
        ${description}
        ${searchSkills.join(" ")}
      `.toLowerCase();

      if (
        !/designer|design|ui|ux/.test(
          uiUxText
        )
      ) {
        return false;
      }
    }

    return (
      matchesSearch &&
      matchesLocation &&
      matchesType &&
      matchesMode
    );
  });

  // --------------------------------------------------
  // DISPLAY JOBS
  //
  // Home initially shows 4 jobs.
  // When searching/filtering, show all matches.
  // --------------------------------------------------

  const hasSearchOrFilter =
    keyword.trim() ||
    location.trim() ||
    selectedType ||
    selectedMode ||
    activeFilter !== "For You";

  const visibleJobs =
    hasSearchOrFilter
      ? filteredJobs
      : filteredJobs.slice(0, 4);

  // --------------------------------------------------
  // JOB DETAILS
  //
  // Only JobDetails is opened.
  // Jobs.js is NEVER opened.
  // --------------------------------------------------

  const openJobDetails = (job) => {
    const jobId =
      job._id || job.id;

    navigation.navigate(
      "JobDetails",
      {
        id: jobId,
        job,
      }
    );
  };

  // --------------------------------------------------
  // SAVE JOB
  // --------------------------------------------------

  const toggleSaved = (job) => {
    const jobId =
      job._id || job.id;

    setSavedJobs((previous) =>
      previous.includes(jobId)
        ? previous.filter(
            (id) => id !== jobId
          )
        : [...previous, jobId]
    );
  };

  // --------------------------------------------------
  // CLEAR SEARCH / FILTERS
  // --------------------------------------------------

  const clearFilters = () => {
    setKeyword("");
    setLocation("");
    setSelectedType("");
    setSelectedMode("");
    setActiveFilter("For You");
  };

  // --------------------------------------------------
  // CATEGORY SEARCH
  //
  // Category now filters Home directly.
  // --------------------------------------------------

  const searchCategory = (
    category
  ) => {
    setKeyword(category);
    setLocation("");
    setSelectedType("");
    setSelectedMode("");
    setActiveFilter("For You");
  };

  // --------------------------------------------------
  // SEARCH SUBMIT
  //
  // No navigation.
  // React state already filters the jobs.
  // --------------------------------------------------

  const executeSearch = () => {
    setKeyword(
      keyword.trim()
    );
  };

  // --------------------------------------------------
  // FILTER CHIPS
  // --------------------------------------------------

  const renderFilterChips = (
    items,
    selected,
    onSelect
  ) =>
    items.map((item) => (
      <TouchableOpacity
        key={item || "all"}
        style={[
          styles.chip,
          {
            borderWidth: 1,
            borderColor:
              selected === item
                ? primary
                : border,
            marginBottom: 4,
          },
        ]}
        onPress={() =>
          onSelect(item)
        }
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.chipText,
            selected === item
              ? {
                  color: primary,
                  fontWeight:
                    "700",
                }
              : {},
          ]}
        >
          {item
            ? item
                .split("-")
                .map(
                  (word) =>
                    word
                      .charAt(0)
                      .toUpperCase() +
                    word.slice(1)
                )
                .join(" ")
            : "All"}
        </Text>
      </TouchableOpacity>
    ));

  // --------------------------------------------------
  // CARD STYLE
  // --------------------------------------------------

  const cardStyle = {
    backgroundColor:
      cardColor,
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

  // --------------------------------------------------
  // COMPANY LOGO
  // --------------------------------------------------

  const renderCompanyLogo = (
    job
  ) => {
    const companyName =
      normalize(
        job.company?.name ||
          job.companyName ||
          job.recruiter?.companyName ||
          job.recruiter?.company?.name
      );

    // Google
    if (
      companyName.includes(
        "google"
      )
    ) {
      return (
        <View
          style={{
            width: 43,
            height: 43,
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          <Text
            style={{
              fontSize: 30,
              fontWeight:
                "900",
              color:
                "#4285F4",
            }}
          >
            G
          </Text>
        </View>
      );
    }

    // Microsoft
    if (
      companyName.includes(
        "microsoft"
      )
    ) {
      return (
        <View
          style={{
            width: 43,
            height: 43,
            flexDirection:
              "row",
            flexWrap:
              "wrap",
            gap: 2,
            padding: 3,
          }}
        >
          {[
            "#F25022",
            "#7FBA00",
            "#00A4EF",
            "#FFB900",
          ].map(
            (
              logoColor,
              index
            ) => (
              <View
                key={index}
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor:
                    logoColor,
                }}
              />
            )
          )}
        </View>
      );
    }

    // Generic company
    return (
      <View
        style={{
          width: 43,
          height: 43,
          borderRadius: 10,
          backgroundColor:
            colors.background,
          borderWidth: 1,
          borderColor:
            border,
          alignItems:
            "center",
          justifyContent:
            "center",
        }}
      >
        <Ionicons
          name="business-outline"
          size={22}
          color={primary}
        />
      </View>
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          colors.background,
      }}
    >
      <StatusBar
        barStyle={
          themeMode === "dark"
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          colors.background
        }
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 8,
            paddingBottom: 30,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            colors={[
              primary,
            ]}
            tintColor={
              primary
            }
          />
        }
      >
        {/* =========================================
            HEADER
        ========================================== */}

        <View
          style={{
            flexDirection:
              "row",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            marginBottom: 22,
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                "Home"
              )
            }
            activeOpacity={
              0.8
            }
            style={{
              flexDirection:
                "row",
              alignItems:
                "center",
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
                fontWeight:
                  "900",
                letterSpacing:
                  -0.7,
              }}
            >
              Jobify
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection:
                "row",
              alignItems:
                "center",
              gap: 10,
            }}
          >
            <ThemeToggle
              compact
            />

            {isAuthenticated ? (
              <TouchableOpacity
                onPress={
                  openDashboard
                }
                accessibilityLabel="Open account"
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor:
                    border,
                  borderRadius: 9,
                  flexDirection:
                    "row",
                  alignItems:
                    "center",
                  gap: 5,
                }}
              >
                
                
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  flexDirection:
                    "row",
                  alignItems:
                    "center",
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    navigateRoot(
                      "Login"
                    )
                  }
                  accessibilityLabel="Sign in"
                  style={{
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color:
                        primary,
                      fontSize: 13,
                      fontWeight:
                        "800",
                    }}
                  >
                    Sign in
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    navigateRoot(
                      "Register"
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                  accessibilityLabel="Register"
                  style={{
                    backgroundColor:
                      primary,
                    borderRadius: 9,
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "#FFFFFF",
                      fontSize: 12,
                      fontWeight:
                        "800",
                    }}
                  >
                    Register
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* =========================================
            GREETING
        ========================================== */}

        <View
          style={{
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              fontSize: 19,
              fontWeight:
                "800",
              color:
                textColor,
            }}
          >
            Good Morning,{" "}
            {user?.name?.split(
              " "
            )[0] ||
              "there"}{" "}
            
          </Text>

          <Text
            style={{
              color: muted,
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Let's find your next
            opportunity
          </Text>
        </View>

        {/* =========================================
            MAIN SEARCH
        ========================================== */}

        <View
          style={{
            ...cardStyle,
            flexDirection:
              "row",
            alignItems:
              "center",
            paddingHorizontal: 13,
            height: 47,
            marginBottom: 10,
          }}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={muted}
          />

          <TextInput
            value={keyword}
            onChangeText={
              setKeyword
            }
            onSubmitEditing={
              executeSearch
            }
            placeholder="Search jobs, companies, skills..."
            placeholderTextColor={
              muted
            }
            returnKeyType="search"
            style={{
              flex: 1,
              color:
                textColor,
              fontSize: 13,
              paddingHorizontal: 10,
              height: "100%",
            }}
          />

          {keyword.length >
            0 && (
            <TouchableOpacity
              onPress={() =>
                setKeyword("")
              }
              accessibilityLabel="Clear search"
              hitSlop={8}
              style={{
                padding: 4,
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={
                  muted
                }
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={
              executeSearch
            }
            accessibilityLabel="Search jobs"
            hitSlop={8}
            style={{
              padding: 4,
            }}
          >
            <Ionicons
              name="arrow-forward-circle"
              size={24}
              color={
                primary
              }
            />
          </TouchableOpacity>
        </View>

        {/* =========================================
            LOCATION SEARCH
        ========================================== */}

        <View
          style={{
            ...cardStyle,
            flexDirection:
              "row",
            alignItems:
              "center",
            paddingHorizontal: 13,
            height: 47,
            marginBottom: 15,
          }}
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={muted}
          />

          <TextInput
            value={location}
            onChangeText={
              setLocation
            }
            placeholder="Search by location..."
            placeholderTextColor={
              muted
            }
            returnKeyType="search"
            style={{
              flex: 1,
              color:
                textColor,
              fontSize: 13,
              paddingHorizontal: 10,
              height: "100%",
            }}
          />

          {location.length >
            0 && (
            <TouchableOpacity
              onPress={() =>
                setLocation("")
              }
              accessibilityLabel="Clear location"
              hitSlop={8}
              style={{
                padding: 4,
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={
                  muted
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* =========================================
            QUICK FILTERS
        ========================================== */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={{
            gap: 9,
            paddingBottom: 4,
          }}
          style={{
            marginBottom: 12,
          }}
        >
          {filters.map(
            (filter) => {
              const selected =
                activeFilter ===
                filter;

              return (
                <TouchableOpacity
                  key={
                    filter
                  }
                  onPress={() =>
                    setActiveFilter(
                      filter
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                  style={{
                    backgroundColor:
                      selected
                        ? primary
                        : cardColor,
                    borderColor:
                      selected
                        ? primary
                        : border,
                    borderWidth: 1,
                    borderRadius: 22,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                  }}
                >
                  <Text
                    style={{
                      color:
                        selected
                          ? "#FFFFFF"
                          : textColor,
                      fontSize: 12,
                      fontWeight:
                        "700",
                    }}
                  >
                    {
                      filter
                    }
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {/* =========================================
            JOB TYPE FILTERS
        ========================================== */}

        <Text
          style={[
            styles.label,
            {
              color:
                textColor,
              marginBottom: 7,
            },
          ]}
        >
          Job type
        </Text>

        <View
          style={{
            flexDirection:
              "row",
            flexWrap:
              "wrap",
            gap: 7,
            marginBottom: 10,
          }}
        >
          {renderFilterChips(
            types,
            selectedType,
            setSelectedType
          )}
        </View>

        {/* =========================================
            WORK MODE FILTERS
        ========================================== */}

        <Text
          style={[
            styles.label,
            {
              color:
                textColor,
              marginBottom: 7,
            },
          ]}
        >
          Work mode
        </Text>

        <View
          style={{
            flexDirection:
              "row",
            flexWrap:
              "wrap",
            gap: 7,
            marginBottom: 15,
          }}
        >
          {renderFilterChips(
            modes,
            selectedMode,
            setSelectedMode
          )}
        </View>

        {/* =========================================
            SEARCH RESULTS HEADER
        ========================================== */}

        <View
          style={{
            flexDirection:
              "row",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            marginBottom: 11,
          }}
        >
          <Text
            style={
              headingStyle
            }
          >
            {hasSearchOrFilter
              ? "Search Results"
              : "Recommended for You"}
          </Text>

          {hasSearchOrFilter && (
            <TouchableOpacity
              onPress={
                clearFilters
              }
            >
              <Text
                style={{
                  color:
                    primary,
                  fontSize: 12,
                  fontWeight:
                    "800",
                }}
              >
                Clear All
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* =========================================
            LOADING / ERROR / RESULTS
        ========================================== */}

        {loadingJobs ? (
          <Loader />
        ) : error ? (
          <View
            style={[
              cardStyle,
              {
                padding: 20,
                alignItems:
                  "center",
                marginBottom: 15,
              },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={
                muted
              }
            />

            <Text
              style={{
                color:
                  textColor,
                fontWeight:
                  "700",
                marginTop: 8,
              }}
            >
              Unable to load
              jobs
            </Text>

            <Text
              style={{
                color:
                  muted,
                fontSize: 12,
                marginTop: 5,
                textAlign:
                  "center",
              }}
            >
              {error}
            </Text>

            <TouchableOpacity
              onPress={
                loadJobs
              }
              style={{
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  color:
                    primary,
                  fontWeight:
                    "800",
                }}
              >
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : visibleJobs.length ===
          0 ? (
          <View
            style={{
              ...cardStyle,
              alignItems:
                "center",
              padding: 24,
              marginBottom: 15,
            }}
          >
            <Ionicons
              name="search-outline"
              size={28}
              color={
                muted
              }
            />

            <Text
              style={{
                color:
                  textColor,
                fontWeight:
                  "700",
                marginTop: 8,
              }}
            >
              No jobs found
            </Text>

            <Text
              style={{
                color:
                  muted,
                fontSize: 12,
                marginTop: 5,
                textAlign:
                  "center",
              }}
            >
              Try another keyword,
              location or filter.
            </Text>

            <TouchableOpacity
              onPress={
                clearFilters
              }
              style={{
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  color:
                    primary,
                  fontWeight:
                    "800",
                }}
              >
                Clear filters
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {hasSearchOrFilter && (
              <Text
                style={[
                  smallText,
                  {
                    marginBottom: 10,
                  },
                ]}
              >
                {
                  filteredJobs.length
                }{" "}
                {filteredJobs.length ===
                1
                  ? "job"
                  : "jobs"}{" "}
                found
              </Text>
            )}

            {visibleJobs.map(
              (job) => {
                const jobId =
                  job._id ||
                  job.id;

                const companyName =
                  job.company
                    ?.name ||
                  job.companyName ||
                  job.recruiter
                    ?.companyName ||
                  job.recruiter
                    ?.company
                    ?.name ||
                  "Company";

                return (
                  <TouchableOpacity
                    key={String(
                      jobId
                    )}
                    activeOpacity={
                      0.9
                    }
                    onPress={() =>
                      openJobDetails(
                        job
                      )
                    }
                    style={{
                      ...cardStyle,
                      flexDirection:
                        "row",
                      alignItems:
                        "flex-start",
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    {renderCompanyLogo(
                      job
                    )}

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 10,
                        paddingTop: 2,
                      }}
                    >
                      <Text
                        numberOfLines={
                          1
                        }
                        style={{
                          color:
                            textColor,
                          fontSize: 13,
                          fontWeight:
                            "800",
                          marginBottom: 4,
                        }}
                      >
                        {job.title ||
                          "Untitled Job"}
                      </Text>

                      <Text
                        numberOfLines={
                          1
                        }
                        style={{
                          color:
                            textColor,
                          fontSize: 11,
                          fontWeight:
                            "600",
                          marginBottom: 3,
                        }}
                      >
                        {
                          companyName
                        }

                        {job.location
                          ? ` · ${job.location}`
                          : ""}
                      </Text>

                      <Text
                        style={[
                          smallText,
                          {
                            marginBottom: 5,
                          },
                        ]}
                      >
                        {job.jobType ||
                          job.type ||
                          "Full-time"}{" "}
                        ·{" "}
                        {job.workMode ||
                          job.mode ||
                          "On-site"}
                      </Text>

                      {job.salary && (
                        <Text
                          style={{
                            color:
                              textColor,
                            fontSize: 12,
                            fontWeight:
                              "800",
                          }}
                        >
                          {
                            job.salary
                          }
                        </Text>
                      )}

                      {Array.isArray(
                        job.skills
                      ) &&
                        job.skills
                          .length >
                          0 && (
                          <View
                            style={{
                              flexDirection:
                                "row",
                              flexWrap:
                                "wrap",
                              gap: 5,
                              marginTop: 7,
                            }}
                          >
                            {job.skills
                              .slice(
                                0,
                                3
                              )
                              .map(
                                (
                                  skill,
                                  index
                                ) => (
                                  <View
                                    key={`${String(
                                      skill
                                    )}-${index}`}
                                    style={
                                      styles.chip
                                    }
                                  >
                                    <Text
                                      style={
                                        styles.chipText
                                      }
                                    >
                                      {String(
                                        skill
                                      )}
                                    </Text>
                                  </View>
                                )
                              )}
                          </View>
                        )}
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        toggleSaved(
                          job
                        )
                      }
                      accessibilityLabel={
                        savedJobs.includes(
                          jobId
                        )
                          ? "Remove saved job"
                          : "Save job"
                      }
                      hitSlop={
                        8
                      }
                      style={{
                        padding: 4,
                      }}
                    >
                      <Ionicons
                        name={
                          savedJobs.includes(
                            jobId
                          )
                            ? "bookmark"
                            : "bookmark-outline"
                        }
                        size={
                          20
                        }
                        color={
                          textColor
                        }
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }
            )}
          </>
        )}

        {/* =========================================
            EXPLORE JOBS
        ========================================== */}

        <View
          style={{
            marginTop: 15,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection:
                "row",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={
                headingStyle
              }
            >
              Explore jobs
            </Text>

            <Text
              style={{
                color:
                  muted,
                fontSize: 11,
              }}
            >
              Search by category
            </Text>
          </View>

          <View
            style={{
              flexDirection:
                "row",
              flexWrap:
                "wrap",
              gap: 10,
            }}
          >
            {categories.map(
              (item) => (
                <TouchableOpacity
                  key={
                    item.title
                  }
                  onPress={() =>
                    searchCategory(
                      item.title
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                  style={{
                    ...cardStyle,
                    width: "48%",
                    flexGrow: 1,
                    flexBasis:
                      "42%",
                    padding: 13,
                    minHeight: 90,
                    justifyContent:
                      "center",
                  }}
                >
                  <Ionicons
                    name={
                      item.icon
                    }
                    size={23}
                    color={
                      primary
                    }
                  />

                  <Text
                    style={{
                      color:
                        textColor,
                      fontSize: 12,
                      fontWeight:
                        "700",
                      marginTop: 9,
                    }}
                  >
                    {
                      item.title
                    }
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* =========================================
            CANDIDATE ACCOUNT
        ========================================== */}

        <View
          style={{
            ...cardStyle,
            padding: 15,
            marginBottom: 12,
          }}
        >
          <Text
            style={
              headingStyle
            }
          >
            Make your next
            move
          </Text>

          <Text
            style={{
              color:
                muted,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 5,
            }}
          >
            Create your profile
            and manage your job
            applications from one
            place.
          </Text>

          <TouchableOpacity
            onPress={() =>
              isAuthenticated
                ? openDashboard()
                : navigateRoot(
                    "Register"
                  )
            }
            style={{
              marginTop: 12,
              alignSelf:
                "flex-start",
            }}
          >
            <Text
              style={{
                color:
                  primary,
                fontWeight:
                  "800",
                fontSize: 13,
              }}
            >
              {isAuthenticated
                ? "Open dashboard →"
                : "Create your account →"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* =========================================
            RECRUITER
        ========================================== */}

        <View
          style={{
            ...cardStyle,
            padding: 15,
            marginBottom: 15,
          }}
        >
          <Text
            style={
              headingStyle
            }
          >
            Hiring for your
            company?
          </Text>

          <Text
            style={{
              color:
                muted,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 5,
            }}
          >
            Connect with candidates
            and find talent for your
            team.
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigateRoot(
                "Register"
              )
            }
            style={{
              marginTop: 12,
              alignSelf:
                "flex-start",
            }}
          >
            <Text
              style={{
                color:
                  primary,
                fontSize: 13,
                fontWeight:
                  "800",
              }}
            >
              Get started with
              Jobify →
            </Text>
          </TouchableOpacity>
        </View>

        {/* =========================================
            FOOTER
        ========================================== */}

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor:
              border,
            paddingTop: 15,
            alignItems:
              "center",
          }}
        >
          <Text
            style={{
              color:
                muted,
              fontSize: 12,
              textAlign:
                "center",
            }}
          >
            © Jobify · Find
            opportunities. Build
            your future.
          </Text>

          <View
            style={{
              flexDirection:
                "row",
              gap: 22,
              marginTop: 12,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                navigateRoot(
                  "About"
                )
              }
            >
              <Text
                style={{
                  color:
                    primary,
                  fontWeight:
                    "700",
                }}
              >
                About
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                navigateRoot(
                  "Contact"
                )
              }
            >
              <Text
                style={{
                  color:
                    primary,
                  fontWeight:
                    "700",
                }}
              >
                Contact
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
