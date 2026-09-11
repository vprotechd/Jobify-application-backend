import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseURL } from "./api";

const socketUrl = String(baseURL || "").replace(/\/api\/?$/i, "");
let socket = null;
let socketUnavailable = false;

export async function connectNotificationSocket(onNotification) {
  const token = await AsyncStorage.getItem("token") || await AsyncStorage.getItem("accessToken");
  if (!token || !socketUrl || socketUnavailable) return null;
  if (!socket) {
    socket = io(socketUrl, { transports: ["polling", "websocket"], autoConnect: false, auth: { token }, reconnection: false, timeout: 10000 });
    socket.on("connect", () => {
      socketUnavailable = false;
      console.log("Jobify realtime notifications connected");
    });
    socket.on("connect_error", () => {
      socketUnavailable = true;
      socket.disconnect();
    });
  } else {
    socket.auth = { token };
  }
  if (onNotification) socket.off("notification:new").on("notification:new", onNotification);
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectNotificationSocket() {
  if (socket) socket.disconnect();
}
export function onNotification(listener) {
  socket?.on("notification:new", listener);
  return () => socket?.off("notification:new", listener);
}
