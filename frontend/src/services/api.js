import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showToast } from "./toast";

const raw = (process.env.EXPO_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/+$/, "");

let configured =
  raw ||
  (Platform.OS === "web"
    ? "http://localhost:5000/api"
    : "http://10.0.2.2:5000/api");

if (
  Platform.OS === "android" &&
  /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/i.test(configured)
) {
  configured = configured.replace(
    /^(https?:\/\/)(localhost|127\.0\.0\.1)/i,
    "$110.0.2.2"
  );
}

const baseURL = /\/api$/i.test(configured)
  ? configured
  : `${configured}/api`;

const api = axios.create({
  baseURL,
  timeout: 25000,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token =
    (await AsyncStorage.getItem("token")) ||
    (await AsyncStorage.getItem("accessToken"));

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof config.url === "string") {
    config.url = config.url.replace(/^(?:\/?api\/)+/i, "/");
  }

  if (config.data instanceof FormData) {
    delete config.headers?.["Content-Type"];
    delete config.headers?.["content-type"];
  }

  return config;
});

export function apiError(error, fallback = "Something went wrong.") {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export { baseURL };

api.interceptors.response.use(
  (response) => {
    const method = String(
      response.config?.method || "get"
    ).toLowerCase();

    if (["post", "put", "patch", "delete"].includes(method)) {
      const message = response.data?.message;

      if (message) {
        showToast("success", message);
      }
    }

    return response;
  },
  (error) => {
    const method = String(
      error.config?.method || "get"
    ).toLowerCase();

    if (["post", "put", "patch", "delete"].includes(method)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Request failed.";

      showToast("error", message);
    }

    return Promise.reject(error);
  }
);

export default api;