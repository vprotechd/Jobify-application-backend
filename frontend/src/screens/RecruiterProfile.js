
import { useTheme } from "../context/ThemeContext";
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
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import api, { apiError } from "../services/api";
import {
  Field,
  Header,
  Loader,
  styles,
} from "../components/common";
import { colors } from "../theme/theme";

export default function RecruiterProfile({ navigation }) {
  const { mode: __themeMode } = useTheme();
  const { logout, updateUser } = useAuth();

  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await api.get("/recruiter/profile");

        if (mounted) {
          setProfile(
            response.data.profile ||
              response.data.recruiter ||
              {}
          );
        }
      } catch (error) {
        if (mounted) {
          Alert.alert("Profile", apiError(error));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (key, value) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  
const save = async () => {
  if (busy) return;

  setBusy(true);

  try {
    const formData = new FormData();

    [
      "name",
      "company",
      "designation",
      "phone",
      "location",
      "website",
      "bio",
      "linkedin",
      "portfolio",
    ].forEach((key) => {
      formData.append(key, profile[key] ?? "");
    });

    if (profile._image?.uri) {
      const image = profile._image;

      if (Platform.OS === "web") {
        const response = await fetch(image.uri);
        const blob = await response.blob();

        formData.append(
          "profileImage",
          blob,
          image.name || "profile.jpg"
        );
      } else {
        formData.append("profileImage", {
          uri: image.uri,
          name: image.name || "profile.jpg",
          type: image.type || "image/jpeg",
        });
      }
    }

    // Let the HTTP client set the multipart boundary automatically.
    const response = await api.put(
      "/recruiter/profile",
      formData
    );

    const savedProfile =
      response.data?.profile ||
      response.data?.recruiter;

    if (savedProfile) {
      setProfile((current) => ({
        ...current,
        ...savedProfile,
        _image: undefined,
      }));

      // Keep the signed-in session in step with the saved picture/name.
      updateUser?.({
        name: savedProfile.name,
        profileImage: savedProfile.profileImage,
      });
    }

    Alert.alert("Profile", "Profile saved successfully.");
  } catch (error) {
    console.error(
      "Recruiter profile update failed:",
      error.response?.status,
      error.response?.data || error.message
    );

    Alert.alert(
      "Profile update failed",
      apiError(error, "Unable to save profile. Please try again.")
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
          "Allow photo access to select a profile image."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        setProfile((current) => ({
          ...current,
          _image: {
            uri: asset.uri,
            name: asset.fileName || "profile.jpg",
            type: asset.mimeType || "image/jpeg",
          },
          profileImage: asset.uri,
        }));
      }
    } catch (error) {
      Alert.alert(
        "Profile image",
        "Unable to select the profile image."
      );
    }
  };

  if (loading) {
    return <Loader />;
  }

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
    >
      <Header
        title="Recruiter Profile"
        subtitle="Keep your professional information and company details up to date."
      />

      <View
        style={[
          styles.card,
          {
            alignItems: "center",
            paddingVertical: 24,
          },
        ]}
      >
        {profile.profileImage ? (
          <Image
            source={{ uri: profile.profileImage }}
            resizeMode="cover"
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              borderWidth: 3,
              borderColor: colors.primary + "30",
            }}
          />
        ) : (
          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: colors.primary + "18",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 40,
                fontWeight: "900",
                color: colors.primary,
              }}
            >
              {profile.name?.charAt(0)?.toUpperCase() || "R"}
            </Text>
          </View>
        )}

        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: colors.text,
            marginTop: 12,
          }}
        >
          {profile.name || "Recruiter"}
        </Text>

        <Text
          style={{
            color: colors.muted,
            marginTop: 4,
          }}
        >
          {profile.designation || "Recruiter Profile"}
        </Text>

        <TouchableOpacity
          style={[
            styles.outline,
            {
              marginTop: 16,
              minWidth: 190,
              alignItems: "center",
            },
          ]}
          onPress={pickImage}
          activeOpacity={0.75}
        >
          <Text style={styles.outlineText}>
            {profile.profileImage
              ? "Change Profile Image"
              : "＋ Add Profile Image"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text
          style={{
            fontSize: 19,
            fontWeight: "800",
            color: colors.text,
            marginBottom: 14,
          }}
        >
          Personal Information
        </Text>

        <Field
          label="Name"
          value={profile.name || ""}
          onChangeText={(value) =>
            updateField("name", value)
          }
        />

        <Field
          label="Phone"
          value={profile.phone || ""}
          onChangeText={(value) =>
            updateField("phone", value)
          }
        />

        <Field
          label="Location"
          value={profile.location || ""}
          onChangeText={(value) =>
            updateField("location", value)
          }
        />
      </View>

      <View style={styles.card}>
        <Text
          style={{
            fontSize: 19,
            fontWeight: "800",
            color: colors.text,
            marginBottom: 14,
          }}
        >
          Professional Information
        </Text>

        <Field
          label="Company"
          value={profile.company || ""}
          onChangeText={(value) =>
            updateField("company", value)
          }
        />

        <Field
          label="Designation"
          value={profile.designation || ""}
          onChangeText={(value) =>
            updateField("designation", value)
          }
        />

        <Field
          label="Website"
          value={profile.website || ""}
          onChangeText={(value) =>
            updateField("website", value)
          }
        />

        <Field
          label="LinkedIn"
          value={profile.linkedin || ""}
          onChangeText={(value) =>
            updateField("linkedin", value)
          }
          autoCapitalize="none"
        />

        <Field
          label="About"
          value={profile.bio || ""}
          onChangeText={(value) =>
            updateField("bio", value)
          }
          multiline
        />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { marginTop: 4 },
        ]}
        onPress={save}
        disabled={busy}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {busy ? "Saving..." : "Save Profile"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.outline,
          { marginTop: 12 },
        ]}
        onPress={() =>
          navigation.navigate("CompanyManager")
        }
        activeOpacity={0.75}
      >
        <Text
          style={{
            color: colors.primary,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Manage Company Details
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.outline,
          {
            marginTop: 10,
            borderColor: colors.danger,
          },
        ]}
        onPress={logout}
        activeOpacity={0.75}
      >
        <Text
          style={{
            color: colors.danger,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Logout
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
