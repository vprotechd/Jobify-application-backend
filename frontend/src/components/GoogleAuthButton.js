import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";
import { toast } from "../services/toast";

WebBrowser.maybeCompleteAuthSession();

const webClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const androidClientId =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
const iosClientId =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

function nativeGoogleRedirect(clientId) {
  if (!clientId) return undefined;

  const prefix = clientId.replace(
    /\.apps\.googleusercontent\.com$/i,
    ""
  );

  return `com.googleusercontent.apps.${prefix}:/oauthredirect`;
}

/* ============================================================
   ORIGINAL MULTICOLOUR GOOGLE "G" LOGO
   Image file: put google-logo.png in your assets folder and
   adjust the path below if your folders are different.
============================================================ */

const googleLogoImage = require("../../assets/google-logo.png");

function GoogleLogo({ size = 18 }) {
  return (
    <Image
      source={googleLogoImage}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

export default function GoogleAuthButton({ role = "jobseeker" }) {
  const { googleLogin } = useAuth();
  const [busy, setBusy] = useState(false);

  const nativeRedirect = useMemo(() => {
    if (Platform.OS === "android") {
      return nativeGoogleRedirect(androidClientId);
    }
    if (Platform.OS === "ios") {
      return nativeGoogleRedirect(iosClientId);
    }
    return undefined;
  }, []);

  const redirectUri = useMemo(() => {
    if (Platform.OS === "web") {
      // For browser testing this resolves from the current web origin/port.
      return makeRedirectUri({
        preferLocalhost: true,
      });
    }

    return nativeRedirect || "jobify:/oauthredirect";
  }, [nativeRedirect]);

  const [request, response, promptAsync] =
    Google.useIdTokenAuthRequest({
      webClientId: webClientId || undefined,
      androidClientId: androidClientId || undefined,
      iosClientId: iosClientId || undefined,
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
      redirectUri,
    });

  const configured = Boolean(
    Platform.OS === "web"
      ? webClientId
      : Platform.OS === "android"
        ? androidClientId
        : Platform.OS === "ios"
          ? iosClientId
          : false
  );

  useEffect(() => {
    let active = true;

    const complete = async () => {
      if (!response) return;

      if (response.type !== "success") {
        if (response.type === "error" && active) {
          toast.error(
            response.params?.error_description ||
              response.params?.error ||
              "Google sign-in failed. Please try again."
          );
        }
        if (active) setBusy(false);
        return;
      }

      const idToken =
        response.params?.id_token ||
        response.authentication?.idToken ||
        response.authentication?.id_token;

      if (!idToken) {
        toast.error(
          "Google did not return an identity token. Check the OAuth client configuration."
        );
        if (active) setBusy(false);
        return;
      }

      if (active) setBusy(true);
      try {
        // await googleLogin(idToken, role);
        console.log("GOOGLE TOKEN RECEIVED:", !!idToken);

try {
  const result = await googleLogin(idToken, role);
  console.log("JOBIFY BACKEND GOOGLE LOGIN:", result);
} catch (error) {
  console.error("JOBIFY BACKEND GOOGLE LOGIN ERROR:", {
    message: error?.message,
    status: error?.response?.status,
    data: error?.response?.data,
  });

  toast.error(
    error?.response?.data?.message ||
    error?.message ||
    "Google backend login failed."
  );
}
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to sign in with Google."
        );
      } finally {
        if (active) setBusy(false);
      }
    };

    complete();
    return () => {
      active = false;
    };
  }, [response, googleLogin, role]);

 const signIn = async () => {
  if (!configured) {
    toast.error(
      `Google Sign-In is not configured for ${Platform.OS}.`
    );
    return;
  }

  if (!request || busy) return;

  try {
    console.log("[JOBIFY GOOGLE OAUTH DEBUG]", {
      platform: Platform.OS,
      clientId: request?.clientId,
      redirectUri: request?.redirectUri,
      responseType: request?.responseType,
      scopes: request?.scopes,
      url: request?.url,
    });

    setBusy(true);

    const result = await promptAsync();

    console.log("[JOBIFY GOOGLE OAUTH RESULT]", {
      type: result?.type,
      error: result?.error,
      params: result?.params,
    });

    if (result?.type !== "success") {
      setBusy(false);
    }
  } catch (error) {
    console.error("[JOBIFY GOOGLE OAUTH ERROR]", error);

    toast.error(
      error?.message || "Unable to open Google sign-in."
    );

    setBusy(false);
  }
};

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      onPress={signIn}
      disabled={!request || busy}
      style={{
        minHeight: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        paddingHorizontal: 16,
        marginBottom: 12,
        opacity: !request || busy ? 0.65 : 1,
      }}
    >
      {/* Original Google "G" on a white badge so it stays visible on any card colour. */}
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <GoogleLogo size={17} />
        )}
      </View>
      <Text
        style={{
          color: colors.text,
          fontWeight: "800",
          fontSize: 15,
        }}
      >
        {busy ? "Connecting to Google..." : "Continue with Google"}
      </Text>
    </TouchableOpacity>
  );
}