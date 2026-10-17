
import { useTheme } from "../context/ThemeContext";
import React, { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api, { apiError } from "../services/api";
import {
  Empty,
  Header,
  Loader,
  styles,
} from "../components/common";
import { colors } from "../theme/theme";

export default function CandidateSearch() {
  const { mode: __themeMode } = useTheme();

  const [candidates, setCandidates] = useState([]);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [access, setAccess] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api.get("/recruiter/candidates", {
        params: { q, location, skill },
      });

      setCandidates(response.data.candidates || []);
      setAccess(response.data.cvAccess);
    } catch (error) {
      Alert.alert(
        "Candidates",
        apiError(error, "Unable to load candidates.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, location, skill]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const preview = async (id) => {
    setBusy(id);

    try {
      const response = await api.get(
        `/recruiter/candidates/${id}`
      );

      setSelected(response.data);
    } catch (error) {
      Alert.alert(
        "Candidate",
        apiError(error, "Unable to load candidate profile.")
      );
    } finally {
      setBusy("");
    }
  };

  const unlock = (id) => {
    if (busy) return;

    Alert.alert(
      "Unlock CV",
      "One free monthly allowance or one paid credit will be used.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unlock",
          onPress: async () => {
            setBusy(`u:${id}`);

            try {
              const response = await api.post(
                `/recruiter/candidates/${id}/unlock`
              );

              setSelected(response.data);

              if (response.data.cvAccess) {
                setAccess(response.data.cvAccess);
              }

              await load();
            } catch (error) {
              Alert.alert(
                "Unlock",
                apiError(error, "Unable to unlock this CV.")
              );
            } finally {
              setBusy("");
            }
          },
        },
      ]
    );
  };

  const contact = async (id) => {
    try {
      const response = await api.post(
        `/recruiter/candidates/${id}/contact`
      );

      const candidate = response.data.candidate || {};

      Alert.alert(
        "Candidate Contact",
        `Email: ${candidate.email || "Not available"}\nPhone: ${
          candidate.phone || "Not available"
        }`
      );
    } catch (error) {
      Alert.alert(
        "Contact",
        apiError(error, "Unable to retrieve contact details.")
      );
    }
  };

  const search = () => {
    setLoading(true);
    load();
  };

  const renderSearchField = (
    value,
    onChangeText,
    placeholder,
    icon
  ) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingHorizontal: 13,
        marginBottom: 11,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        style={{
          flex: 1,
          paddingVertical: 13,
          color: colors.text,
          fontSize: 14,
        }}
        returnKeyType="search"
        onSubmitEditing={search}
      />
    </View>
  );

  const selectedCandidate = selected?.candidate;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: 35,
          paddingBottom: 32,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Header
        eyebrow="Recruiter Dashboard"
        title="Find Candidates"
        subtitle="Discover talented professionals and connect with candidates who match your hiring needs."
      />

      {/* CV credit summary */}
      <View
        style={[
          styles.card,
          {
            marginBottom: 18,
            backgroundColor: colors.softPrimary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "900",
            color: colors.text,
          }}
        >
          Your CV Unlock Credits
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 14,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Text style={styles.muted}>
              Free remaining
            </Text>

            <Text
              style={{
                color: colors.primary,
                fontSize: 23,
                fontWeight: "900",
                marginTop: 4,
              }}
            >
              {access?.freeRemaining ?? 10}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Text style={styles.muted}>
              Paid credits
            </Text>

            <Text
              style={{
                color: colors.text,
                fontSize: 23,
                fontWeight: "900",
                marginTop: 4,
              }}
            >
              {access?.paidCredits ?? 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Search form */}
      <View
        style={[
          styles.card,
          {
            marginBottom: 18,
            padding: 16,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "900",
            color: colors.text,
            marginBottom: 15,
          }}
        >
          Search Professionals
        </Text>

        {renderSearchField(
          q,
          setQ,
          "Name or professional headline"
        )}

        {renderSearchField(
          location,
          setLocation,
          "City or location"
        )}

        {renderSearchField(
          skill,
          setSkill,
          "Skill (e.g. React, Node.js)"
        )}

        <TouchableOpacity
          style={[styles.button, { marginTop: 3 }]}
          onPress={search}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? "Searching..." : "Search Candidates"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search results */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "900",
          color: colors.text,
          marginBottom: 12,
        }}
      >
        Candidate Results
      </Text>

      {loading ? (
        <Loader />
      ) : candidates.length === 0 ? (
        <Empty text="No candidates found. Try different search keywords." />
      ) : (
        candidates.map((candidate) => (
          <View
            style={[
              styles.card,
              {
                marginBottom: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            key={candidate._id}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: colors.text,
              }}
            >
              {candidate.name || "Candidate"}
            </Text>

            <Text
              style={[
                styles.muted,
                {
                  marginTop: 5,
                  lineHeight: 20,
                },
              ]}
            >
              {candidate.headline || "Professional Candidate"}
            </Text>

            <Text
              style={[
                styles.muted,
                { marginTop: 3 },
              ]}
            >
              {candidate.location || "Location not set"}
            </Text>

            {/* Skills */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 7,
                marginTop: 12,
              }}
            >
              {(candidate.skills || [])
                .slice(0, 6)
                .map((item, index) => (
                  <View
                    style={[
                      styles.chip,
                      {
                        marginBottom: 0,
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                    ]}
                    key={`${item}-${index}`}
                  >
                    <Text style={styles.chipText}>
                      {item}
                    </Text>
                  </View>
                ))}
            </View>

            {/* Candidate actions */}
            <View
              style={{
                flexDirection: "row",
                gap: 9,
                marginTop: 16,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.outline,
                  {
                    flex: 1,
                    marginBottom: 0,
                  },
                ]}
                onPress={() => preview(candidate._id)}
                disabled={Boolean(busy)}
                activeOpacity={0.75}
              >
                <Text style={styles.outlineText}>
                  {busy === candidate._id
                    ? "Loading..."
                    : "View Profile"}
                </Text>
              </TouchableOpacity>

              {candidate.cvUnlocked ? (
                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      flex: 1,
                      marginBottom: 0,
                    },
                  ]}
                  onPress={() => contact(candidate._id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    Contact
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      flex: 1,
                      marginBottom: 0,
                      opacity: busy ? 0.65 : 1,
                    },
                  ]}
                  onPress={() => unlock(candidate._id)}
                  disabled={Boolean(busy)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {busy === `u:${candidate._id}`
                      ? "Unlocking..."
                      : "Unlock CV"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}

      {/* Selected candidate profile */}
      {selected && (
        <View
          style={[
            styles.card,
            {
              marginTop: 12,
              padding: 18,
              borderWidth: 1,
              borderColor: colors.primary,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 21,
              fontWeight: "900",
              color: colors.text,
            }}
          >
            Candidate Profile
          </Text>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: colors.primary,
              marginTop: 14,
            }}
          >
            {selectedCandidate?.name || "Candidate"}
          </Text>

          <Text
            style={[
              styles.muted,
              { marginTop: 5 },
            ]}
          >
            {selectedCandidate?.headline || "Professional Candidate"}
          </Text>

          <Text
            style={{
              color: colors.text,
              lineHeight: 22,
              marginTop: 14,
            }}
          >
            Skills:{" "}
            {(selectedCandidate?.skills || []).join(", ") || "—"}
          </Text>

          {selected.unlocked ? (
            <>
              <View
                style={{
                  backgroundColor: colors.softPrimary,
                  padding: 12,
                  borderRadius: 10,
                  marginTop: 14,
                }}
              >
                <Text
                  style={{
                    color: colors.success,
                    fontWeight: "900",
                  }}
                >
                  CV Unlocked
                </Text>
              </View>

              <Text
                style={[
                  styles.muted,
                  { marginTop: 12 },
                ]}
              >
                Email: {selectedCandidate?.email || "—"}
              </Text>

              <Text
                style={[
                  styles.muted,
                  { marginTop: 7 },
                ]}
              >
                Phone: {selectedCandidate?.phone || "—"}
              </Text>

              <Text
                style={[
                  styles.muted,
                  { marginTop: 7 },
                ]}
              >
                LinkedIn: {selectedCandidate?.linkedin || "—"}
              </Text>

              <TouchableOpacity
                style={[
                  styles.button,
                  { marginTop: 16 },
                ]}
                onPress={() =>
                  contact(selectedCandidate._id)
                }
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  Contact Candidate
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.button,
                { marginTop: 16 },
              ]}
              onPress={() =>
                unlock(selectedCandidate?._id)
              }
              disabled={Boolean(busy)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                Unlock CV
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.outline,
              { marginTop: 10 },
            ]}
            onPress={() => setSelected(null)}
          >
            <Text style={styles.outlineText}>
              Close Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
