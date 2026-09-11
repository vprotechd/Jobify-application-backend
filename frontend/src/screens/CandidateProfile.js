import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

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
  const { logout } = useAuth();

  const [p, setP] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [p.profileImage]);

  const loadProfile = async () => {
    try {
      const r = await api.get("/profile/me");
      setP(r.data.profile || {});
    } catch (e) {
      Alert.alert("Profile", apiError(e));
    } finally {
      setLoading(false);
    }
  };

  /*
   * Converts backend image path into a complete URL.
   *
   * Examples:
   * /uploads/profile.jpg
   * -> https://jobify-application-backend.onrender.com/uploads/profile.jpg
   *
   * https://...
   * -> remains unchanged
   */
  const getProfileImageUrl = (image) => {
    if (!image) return null;

    // Local selected image
    if (
      image.startsWith("file://") ||
      image.startsWith("content://") ||
      image.startsWith("blob:")
    ) {
      return image;
    }

    // Already complete URL
    if (/^https?:\/\//i.test(image)) {
      try {
        const parsed = new URL(image);
        if (parsed.protocol === "http:" && !/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
          parsed.protocol = "https:";
          return parsed.toString();
        }
      } catch {}
      return image;
    }

    // Get backend root from API baseURL
    const backendRoot = String(baseURL || "")
      .replace(/\/api\/?$/i, "")
      .replace(/\/+$/, "");

    // Backend returns /uploads/filename
    if (image.startsWith("/")) {
      return `${backendRoot}${image}`;
    }

    return `${backendRoot}/${image}`;
  };

  const save = async () => {
    setBusy(true);

    try {
      const fd = new FormData();

      [
        "name",
        "phone",
        "location",
        "headline",
        "bio",
        "education",
        "experience",
        "linkedin",
        "portfolio",
      ].forEach((k) => {
        fd.append(k, p[k] || "");
      });

      fd.append(
        "skills",
        Array.isArray(p.skills)
          ? p.skills.join(", ")
          : p.skills || ""
      );

      // Profile image
      if (p._image) {
        let imageUpload = p._image;
        if (Platform.OS === "web" && imageUpload.uri) {
          const imageBlob = await fetch(imageUpload.uri).then((response) => response.blob());
          imageUpload = new File([imageBlob], imageUpload.name || "profile.jpg", {
            type: imageUpload.type || imageBlob.type || "image/jpeg",
          });
        }
        fd.append("profileImage", imageUpload);
      }

      // Resume
      if (p._resume) {
        fd.append("resume", p._resume);
      }

      const response = await api.put("/profile/me", fd);

      /*
       * If backend returns updated profile,
       * immediately update screen with it.
       */
      if (response.data?.profile) {
        setP(response.data.profile);
      } else {
        // Otherwise reload profile
        await loadProfile();
      }

      Alert.alert(
        "Profile",
        "Profile saved successfully."
      );
    } catch (e) {
      Alert.alert(
        "Profile",
        apiError(e, "Unable to save profile.")
      );
    } finally {
      setBusy(false);
    }
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo library access to select a profile picture."
        );
        return;
      }

      const r =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (!r.canceled && r.assets?.length) {
        const a = r.assets[0];

        const imageFile = {
          uri: a.uri,
          name: a.fileName || "profile.jpg",
          type: a.mimeType || "image/jpeg",
        };

        setP((x) => ({
          ...x,

          // Immediately show selected image
          profileImage: a.uri,

          // Keep actual file for upload
          _image: imageFile,
        }));
      }
    } catch (e) {
      Alert.alert(
        "Image",
        "Unable to select profile picture."
      );
    }
  };

  const pickResume = async () => {
    try {
      const r =
        await DocumentPicker.getDocumentAsync({
          type: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          copyToCacheDirectory: true,
        });

      if (!r.canceled && r.assets?.length) {
        const a = r.assets[0];

        setP((x) => ({
          ...x,

          resume: a.name,

          _resume: {
            uri: a.uri,
            name: a.name || "resume.pdf",
            type:
              a.mimeType ||
              "application/pdf",
          },
        }));
      }
    } catch (e) {
      Alert.alert(
        "Resume",
        "Unable to select resume."
      );
    }
  };

  if (loading) {
    return <Loader />;
  }

  const imageUrl = getProfileImageUrl(
    p.profileImage
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Header
        title="My Profile"
        subtitle="Build a complete profile so recruiters can understand your experience."
      />

      {/* PROFILE PHOTO */}
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
            backgroundColor: "#e5e7eb",
            borderWidth: 3,
            borderColor: colors.primary || "#2563eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageUrl && !imageFailed ? (
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: "100%",
                height: "100%",
              }}
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
              {String(p.name || "U")
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
          }}
        >
          {p.name || "Your Profile"}
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
        >
          <Text style={styles.outlineText}>
            {imageUrl
              ? "Change Profile Picture"
              : "Add Profile Picture"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* RESUME */}
      <View style={styles.card}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
          }}
        >
          Profile & Resume
        </Text>

        <TouchableOpacity
          style={[
            styles.outline,
            { marginTop: 12 },
          ]}
          onPress={pickResume}
          disabled={busy}
        >
          <Text style={styles.outlineText}>
            {p.resume
              ? `Resume: ${String(p.resume)
                  .split("/")
                  .pop()}`
              : "Upload Resume (PDF/DOC/DOCX)"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* PROFILE FIELDS */}

      <Field
        label="Name"
        value={p.name || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            name: v,
          }))
        }
      />

      <Field
        label="Phone"
        value={p.phone || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            phone: v,
          }))
        }
      />

      <Field
        label="Location"
        value={p.location || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            location: v,
          }))
        }
      />

      <Field
        label="Professional headline"
        value={p.headline || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            headline: v,
          }))
        }
      />

      <Field
        label="About / Bio"
        value={p.bio || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            bio: v,
          }))
        }
        multiline
      />

      <Field
        label="Skills (comma separated)"
        value={
          Array.isArray(p.skills)
            ? p.skills.join(", ")
            : p.skills || ""
        }
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            skills: v,
          }))
        }
      />

      <Field
        label="Education"
        value={p.education || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            education: v,
          }))
        }
        multiline
      />

      <Field
        label="Experience"
        value={p.experience || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            experience: v,
          }))
        }
        multiline
      />

      <Field
        label="LinkedIn"
        value={p.linkedin || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            linkedin: v,
          }))
        }
        autoCapitalize="none"
      />

      <Field
        label="Portfolio"
        value={p.portfolio || ""}
        onChangeText={(v) =>
          setP((x) => ({
            ...x,
            portfolio: v,
          }))
        }
        autoCapitalize="none"
      />

      {/* SAVE */}
      <TouchableOpacity
        style={styles.button}
        onPress={save}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {busy ? "Saving..." : "Save Profile"}
        </Text>
      </TouchableOpacity>

      {/* LOGOUT */}
      <TouchableOpacity
        style={[
          styles.outline,
          {
            borderColor: "#fecaca",
            marginBottom: 30,
          },
        ]}
        onPress={logout}
        disabled={busy}
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