import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import api, { baseURL } from "./api";

const safeFileName = (filename) =>
  String(filename || "resume.pdf").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");

const fileNameFromHeaders = (headers, fallback) => {
  const disposition =
    headers?.["content-disposition"] ||
    headers?.["Content-Disposition"] ||
    "";
  const match = String(disposition).match(
    /filename\*?=(?:UTF-8''|")?([^";\r\n]+)/i
  );
  if (!match) return fallback;

  try {
    return safeFileName(decodeURIComponent(match[1].replace(/"$/, "")));
  } catch {
    return safeFileName(match[1].replace(/"$/, ""));
  }
};

const mimeTypeFor = (filename) =>
  filename.toLowerCase().endsWith(".docx")
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : filename.toLowerCase().endsWith(".doc")
    ? "application/msword"
    : "application/pdf";

const getSessionToken = async () =>
  (await AsyncStorage.getItem("token")) ||
  (await AsyncStorage.getItem("accessToken"));

const errorMessageFromFile = async (uri) => {
  try {
    const body = await FileSystem.readAsStringAsync(uri);
    return JSON.parse(body)?.message || "Unable to download the resume.";
  } catch {
    return "Unable to download the resume.";
  }
};

export default async function downloadResume(endpoint, filename) {
  const name = safeFileName(filename);

  if (Platform.OS === "web") {
    const token = await getSessionToken();
    if (!token) throw new Error("Your session has expired. Please sign in again.");

    let response;
    try {
      response = await api.get(endpoint, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      // With responseType "blob" the server's JSON error arrives as a Blob,
      // so read it to show the real reason instead of "status code 401".
      const body = error?.response?.data;
      if (body instanceof Blob) {
        try {
          const message = JSON.parse(await body.text())?.message;
          if (message) throw new Error(message);
        } catch (parsed) {
          if (parsed instanceof Error && parsed.message && !(parsed instanceof SyntaxError)) throw parsed;
        }
      }
      throw error;
    }
    const downloadName = fileNameFromHeaders(response.headers, name);
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const token = await getSessionToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const localUri = `${FileSystem.documentDirectory}${Date.now()}-${name}`;
  const response = await FileSystem.downloadAsync(
    `${baseURL}${endpoint}`,
    localUri,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(await errorMessageFromFile(response.uri));
  }

  const downloadName = fileNameFromHeaders(response.headers, name);
  let downloadUri = response.uri;
  if (downloadName !== name) {
    downloadUri = `${FileSystem.documentDirectory}${Date.now()}-${downloadName}`;
    await FileSystem.moveAsync({ from: response.uri, to: downloadUri });
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Resume downloaded, but sharing is unavailable on this device.");
  }

  await Sharing.shareAsync(downloadUri, {
    dialogTitle: "Resume downloaded",
    mimeType: mimeTypeFor(downloadName),
  });
}
