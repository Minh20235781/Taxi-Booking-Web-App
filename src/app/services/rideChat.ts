import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, getAuthToken, type RideMessage } from "./api";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

let socket: Socket | null = null;

export function getRideChatSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true
    });
  }
  return socket;
}

export function disconnectRideChatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRideRoom(rideId: number): Promise<void> {
  const s = getRideChatSocket();
  if (!s.connected) {
    s.connect();
  }
  return new Promise((resolve, reject) => {
    s.emit("join_ride", { rideId }, (res: { ok?: boolean; message?: string }) => {
      if (res?.ok) resolve();
      else reject(new Error(res?.message || "Failed to join ride room"));
    });
  });
}

export function sendRideMessage(payload: {
  rideId: number;
  senderUserId: number;
  senderRole: "USER" | "DRIVER";
  body: string;
}): Promise<RideMessage> {
  const s = getRideChatSocket();
  return new Promise((resolve, reject) => {
    s.emit(
      "send_message",
      payload,
      (res: { ok?: boolean; message?: RideMessage; error?: string }) => {
        if (res?.ok && res.message) resolve(res.message);
        else reject(new Error(res?.error || res?.message || "Failed to send message"));
      }
    );
  });
}

export function subscribeRideMessages(handler: (message: RideMessage) => void) {
  const s = getRideChatSocket();
  s.on("new_message", handler);
  return () => {
    s.off("new_message", handler);
  };
}

/** Prefer JWT claims — localStorage auth_user is shared across tabs and can be stale. */
export function getAuthUserId(): number | null {
  const token = getAuthToken();
  if (token) {
    const payload = decodeJwtPayload(token);
    const id = Number(payload?.sub);
    if (Number.isInteger(id) && id > 0) return id;
  }
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    const id = Number(user?.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function getAuthUserRole(): "USER" | "DRIVER" | null {
  const token = getAuthToken();
  if (token) {
    const payload = decodeJwtPayload(token);
    const role = String(payload?.role || "").toUpperCase();
    if (role === "USER" || role === "DRIVER") return role;
  }
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    const role = String(JSON.parse(raw)?.role || "").toUpperCase();
    if (role === "USER" || role === "DRIVER") return role;
    return null;
  } catch {
    return null;
  }
}
