
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import api, { apiError, baseURL } from "../services/api";
import {
  Field,
  Header,
  Loader,
  styles,
} from "../components/common";
import { colors } from "../theme/theme";

export default function CandidateProfile() {
  const { mode: __themeMode } = useTheme();
  const { logout } = useAuth();

  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const loadProfile = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    try {
      const response = await api.get(
        `/profile/me?_=${Date.now()}`
      );

      setProfile(response.data?.profile || {});
    } catch (error) {
      Alert.alert(
        "Profile",
        apiError(error, "Unable to load your profile.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile(true);
  }, [loadProfile]);

  useEffect(() => {
    setImageFailed(false);
  }, [profile.profileImage]);

  const getProfileImageUrl = (image) => {
    if (!image || typeof image !== "string") return null;

    if (
      image.startsWith("file://") ||
      image.startsWith("content://") ||
      image.startsWith("blob:")
    ) {
      return image;
    }

    if (/^https?:\/\//i.test(image)) {
      try {
        const parsed = new URL(image);

        if (
          parsed.protocol === "http:" &&
          !/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)
        ) {
          parsed.protocol = "https:";
        }

        parsed.searchParams.set("_profile_refresh", String(Date.now()));
        return parsed.toString();
      } catch {
        return image;
      }
    }

    const backendRoot = String(baseURL || "")
      .replace(/\/api\/?$/i, "")
      .replace(/\/+$/, "");

    if (!backendRoot) return null;

    return `${backendRoot}/${image.replace(/^\/+/, "")}`;
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo library access to select a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      setImageFailed(false);
      setProfile((current) => ({
        ...current,
        profileImage: asset.uri,
        _image: {
          uri: asset.uri,
          name: asset.fileName || "profile.jpg",
          type: asset.mimeType || "image/jpeg",
        },
      }));
    } catch {
      Alert.alert("Image", "Unable to select a profile picture.");
    }
  };

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      setProfile((current) => ({
        ...current,
        resume: asset.name,
        _resume: {
          uri: asset.uri,
          name: asset.name || "resume.pdf",
          type: asset.mimeType || "application/pdf",
        },
      }));
    } catch {
      Alert.alert("Resume", "Unable to select a resume.");
    }
  };

  const appendUpload = async (formData, fieldName, upload, fallbackName) => {
    if (!upload) return;

    if (Platform.OS === "web") {
      let file = upload;

      if (upload.uri) {
        const response = await fetch(upload.uri);

        if (!response.ok) {
          throw new Error(`Unable to read ${fallbackName}.`);
        }

        const blob = await response.blob();

        file = new File(
          [blob],
          upload.name || fallbackName,
          {
            type: upload.type || blob.type || "application/octet-stream",
          }
        );
      }

      formData.append(fieldName, file);
    } else {
      formData.append(fieldName, {
        uri: upload.uri,
        name: upload.name || fallbackName,
        type: upload.type || "application/octet-stream",
      });
    }
  };

  const saveProfile = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const profileData = {
        name: profile.name || "",
        phone: profile.phone || "",
        location: profile.location || "",
        headline: profile.headline || "",
        bio: profile.bio || "",
        education: profile.education || "",
        experience: profile.experience || "",
        linkedin: profile.linkedin || "",
        portfolio: profile.portfolio || "",
        skills: Array.isArray(profile.skills)
          ? profile.skills.join(", ")
          : profile.skills || "",
      };
      let payload = profileData;

      if (profile._image || profile._resume) {
        const formData = new FormData();

        Object.entries(profileData).forEach(([key, value]) => {
          formData.append(key, value);
        });

        await appendUpload(
          formData,
          "profileImage",
          profile._image,
          "profile.jpg"
        );

        await appendUpload(
          formData,
          "resume",
          profile._resume,
          "resume.pdf"
        );

        payload = formData;
      }

      const response = await api.put("/profile/me", payload);

      if (response.data?.profile) {
        setImageFailed(false);
        setProfile((current) => ({
          ...current,
          ...response.data.profile,
          _image: undefined,
          _resume: undefined,
        }));
      } else {
        await loadProfile();
      }

      Alert.alert("Profile", "Profile saved successfully.");
    } catch (error) {
      Alert.alert(
        "Profile",
        apiError(error, "Unable to save your profile.")
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  if (loading) {
    return <Loader />;
  }

  const imageUrl = getProfileImageUrl(profile.profileImage);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: 40,
          paddingBottom: 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Header
        title="My Profile"
        subtitle="Build a complete profile so recruiters can understand your experience."
      />

      {/* Profile picture */}
      <View
        style={[
          styles.card,
          {
            alignItems: "center",
            paddingVertical: 24,
          },
        ]}
      >
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            overflow: "hidden",
            backgroundColor: colors.surface,
            borderWidth: 3,
            borderColor: colors.primary || "#2563eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageUrl && !imageFailed ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Text
              style={{
                fontSize: 42,
                fontWeight: "800",
                color: "#64748b",
              }}
            >
              {String(profile.name || "U")
                .charAt(0)
                .toUpperCase()}
            </Text>
          )}
        </View>

        <Text
          style={{
            marginTop: 12,
            fontSize: 18,
            fontWeight: "800",
            color: colors.text,
          }}
        >
          {profile.name || "Your Profile"}
        </Text>

        <TouchableOpacity
          style={[
            styles.outline,
            {
              marginTop: 14,
              minWidth: 180,
              alignItems: "center",
            },
          ]}
          onPress={pickImage}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineText}>
            {profile._image || profile.profileImage
              ? "Change Profile Picture"
              : "Add Profile Picture"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resume */}
      <View style={styles.card}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: colors.text,
          }}
        >
          Profile & Resume
        </Text>

        <TouchableOpacity
          style={[styles.outline, { marginTop: 12 }]}
          onPress={pickResume}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineText}>
            {profile._resume?.name ||
              (profile.resume
                ? `Resume: ${String(profile.resume).split("/").pop()}`
                : "Upload Resume (PDF/DOC/DOCX)")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile fields */}
      <Field
        label="Name"
        value={profile.name || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, name: value }))
        }
      />

      <Field
        label="Phone"
        value={profile.phone || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, phone: value }))
        }
      />

      <Field
        label="Location"
        value={profile.location || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, location: value }))
        }
      />

      <Field
        label="Professional headline"
        value={profile.headline || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, headline: value }))
        }
      />

      <Field
        label="About / Bio"
        value={profile.bio || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, bio: value }))
        }
        multiline
      />

      <Field
        label="Skills (comma separated)"
        value={
          Array.isArray(profile.skills)
            ? profile.skills.join(", ")
            : profile.skills || ""
        }
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, skills: value }))
        }
      />

      <Field
        label="Education"
        value={profile.education || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, education: value }))
        }
        multiline
      />

      <Field
        label="Experience"
        value={profile.experience || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, experience: value }))
        }
        multiline
      />

      <Field
        label="LinkedIn"
        value={profile.linkedin || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, linkedin: value }))
        }
        autoCapitalize="none"
      />

      <Field
        label="Portfolio"
        value={profile.portfolio || ""}
        onChangeText={(value) =>
          setProfile((current) => ({ ...current, portfolio: value }))
        }
        autoCapitalize="none"
      />

      {/* Save profile */}
      <TouchableOpacity
        style={[styles.button, { marginTop: 8 }]}
        onPress={saveProfile}
        disabled={busy}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {busy ? "Saving..." : "Save Profile"}
        </Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={[
          styles.outline,
          {
            borderColor: "#fecaca",
            marginTop: 12,
            marginBottom: 24,
          },
        ]}
        onPress={logout}
        disabled={busy}
        activeOpacity={0.8}
      >
        <Text
          style={{
            color: colors.danger,
            fontWeight: "800",
          }}
        >
          Logout
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
