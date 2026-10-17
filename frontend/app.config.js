const base = require("./app.json");

const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

const schemes = ["jobify"];
if (androidClientId) {
  schemes.push(`com.googleusercontent.apps.${androidClientId.split(".apps.googleusercontent.com")[0]}`);
}
if (iosClientId) {
  schemes.push(`com.googleusercontent.apps.${iosClientId.split(".apps.googleusercontent.com")[0]}`);
}

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    scheme: schemes,
    extra: {
      ...base.expo.extra,
      google: {
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
        androidClientId,
        iosClientId,
      },
    },
  },
};
