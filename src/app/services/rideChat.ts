import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, type RideMessage } from "./api";

let socket: Socket | null = null;
const joinedRideIds = new Set<number>();

function emitJoinRide(s: Socket, rideId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    s.emit("join_ride", { rideId }, (res: { ok?: boolean; message?: string }) => {
      if (res?.ok) resolve();
      else reject(new Error(res?.message || "Failed to join ride room"));
    });
  });
}

export function getRideChatSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true
    });
    socket.on("connect", () => {
      joinedRideIds.forEach((rideId) => {
        emitJoinRide(socket as Socket, rideId).catch((err) => {
          console.error("Failed to rejoin ride chat room:", err);
        });
      });
    });
  }
  return socket;
}

export function disconnectRideChatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  joinedRideIds.clear();
}

export function joinRideRoom(rideId: number): Promise<void> {
  const s = getRideChatSocket();
  if (!s.connected) {
    s.connect();
  }
  joinedRideIds.add(rideId);
  return emitJoinRide(s, rideId);
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

export function getAuthUserId(): number | null {
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
