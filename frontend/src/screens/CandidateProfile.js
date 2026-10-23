
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  const { logout, updateUser } = useAuth();

  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "success" | "error", text }
  const [imageVersion, setImageVersion] = useState(() => Date.now());

  // Rules mirrored from the server (backend/middleware/upload.js) so users get
  // instant feedback instead of waiting for a failed upload.
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const IMAGE_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const RESUME_EXT = [".pdf", ".doc", ".docx"];

  const loadProfile = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    try {
      const response = await api.get(
        `/profile/me?_=${Date.now()}`
      );

      setProfile(response.data?.profile || {});
      setImageVersion(Date.now());
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

  const getProfileImageUrl = (image, version) => {
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

        // The version only changes after a load/save, so the picture is not
        // re-downloaded (and does not flicker) while the user types.
        parsed.searchParams.set("_profile_refresh", String(version));
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
      const mime = String(asset.mimeType || "image/jpeg").toLowerCase();

      if (!IMAGE_MIME.includes(mime)) {
        setNotice({ type: "error", text: "Profile picture must be a JPG, PNG or WEBP image." });
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) {
        setNotice({ type: "error", text: "Profile picture must be smaller than 5 MB." });
        return;
      }

      setNotice(null);
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
      const lowerName = String(asset.name || "").toLowerCase();

      if (!RESUME_EXT.some((ext) => lowerName.endsWith(ext))) {
        setNotice({ type: "error", text: "Resume must be a PDF, DOC or DOCX file." });
        return;
      }

      if (asset.size && asset.size > MAX_FILE_BYTES) {
        setNotice({ type: "error", text: "Resume must be smaller than 5 MB." });
        return;
      }

      setNotice(null);
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

    if (!String(profile.name || "").trim()) {
      setNotice({ type: "error", text: "Name cannot be empty." });
      return;
    }

    setBusy(true);
    setNotice(null);

    const hasFiles = Boolean(profile._image || profile._resume);

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

      if (hasFiles) {
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

      // File uploads (and a cold-starting server) can take longer than the
      // default 25s request timeout.
      const response = await api.put(
        "/profile/me",
        payload,
        hasFiles ? { timeout: 120000 } : undefined
      );

      const saved = response.data?.profile;

      if (saved) {
        setImageFailed(false);
        setImageVersion(Date.now());
        setProfile((current) => ({
          ...current,
          ...saved,
          _image: undefined,
          _resume: undefined,
        }));
        // Keep the signed-in session in step with what was just saved.
        updateUser({
          name: saved.name,
          profileImage: saved.profileImage,
          skills: saved.skills,
          headline: saved.headline,
        });
      } else {
        await loadProfile();
      }

      setNotice({
        type: "success",
        text: hasFiles
          ? "Profile and files saved successfully."
          : "Profile saved successfully.",
      });
    } catch (error) {
      const data = error?.response?.data;
      const message = apiError(error, "Unable to save your profile.");

      // The server saves the text fields first. If only an upload failed it
      // returns the saved profile so nothing the user typed is lost.
      if (data?.partial && data?.profile) {
        const failedImage = /profile picture/i.test(message);
        const failedResume = /resume/i.test(message);

        setImageVersion(Date.now());
        setProfile((current) => ({
          ...current,
          ...data.profile,
          ...(failedImage
            ? { profileImage: current.profileImage }
            : { _image: undefined }),
          ...(failedResume
            ? { resume: current.resume }
            : { _resume: undefined }),
        }));
        updateUser({
          name: data.profile.name,
          profileImage: data.profile.profileImage,
          skills: data.profile.skills,
          headline: data.profile.headline,
        });
      }

      setNotice({ type: "error", text: message });
    } finally {
      setBusy(false);
    }
  };

  const downloadResume = async () => {
    if (Platform.OS !== "web" || !profile.resume) return;

    try {
      const key = String(profile.resume).split("/").pop();
      const response = await api.get(`/files/resume/${key}`, {
        responseType: "blob",
      });
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = profile.resumeName || "resume.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      let message = apiError(error, "Unable to download your resume.");

      // With responseType "blob" the JSON error body arrives as a Blob.
      try {
        const body = await error?.response?.data?.text?.();
        if (body) message = JSON.parse(body).message || message;
      } catch {
        // keep the fallback message
      }

      setNotice({ type: "error", text: message });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  if (loading) {
    return <Loader />;
  }

  const imageUrl = getProfileImageUrl(profile.profileImage, imageVersion);
  const hasPendingFiles = Boolean(profile._image || profile._resume);

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
                ? `Resume: ${
                    profile.resumeName ||
                    String(profile.resume).split("/").pop()
                  }`
                : "Upload Resume (PDF/DOC/DOCX)")}
          </Text>
        </TouchableOpacity>

        {profile._resume ? (
          <Text style={[styles.muted, { marginTop: 8 }]}>
            Selected. Tap Save Profile to upload it.
          </Text>
        ) : null}

        {profile.resume && !profile._resume && Platform.OS === "web" ? (
          <TouchableOpacity
            style={[styles.outline, { marginTop: 10 }]}
            onPress={downloadResume}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Text style={styles.outlineText}>Download current resume</Text>
          </TouchableOpacity>
        ) : null}
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
        {busy ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={[styles.buttonText, { marginLeft: 8 }]}>
              {hasPendingFiles ? "Uploading & saving..." : "Saving..."}
            </Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Save Profile</Text>
        )}
      </TouchableOpacity>

      {notice ? (
        <View
          accessibilityRole="alert"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: notice.type === "success" ? "#86efac" : "#fecaca",
            backgroundColor: notice.type === "success" ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <Text
            style={{
              color: notice.type === "success" ? "#166534" : "#991b1b",
              fontWeight: "700",
              lineHeight: 20,
            }}
          >
            {notice.text}
          </Text>
        </View>
      ) : null}

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
