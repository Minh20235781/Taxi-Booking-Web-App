import { useCallback, useEffect, useRef, useState } from "react";
import { api, type RideMessage } from "../services/api";
import {
  getAuthUserId,
  getAuthUserRole,
  joinRideRoom,
  sendRideMessage,
  subscribeRideMessages
} from "../services/rideChat";

export type ChatUiSender = "self" | "peer";

export interface ChatUiMessage {
  id: number;
  sender: ChatUiSender;
  text: string;
  translated: string | null;
  time: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function toUiMessage(msg: RideMessage, selfUserId: number): ChatUiMessage {
  return {
    id: msg.id,
    sender: msg.senderUserId === selfUserId ? "self" : "peer",
    text: msg.body,
    translated: msg.translatedBody ?? null,
    time: formatTime(msg.createdAt)
  };
}

export function useRideChat(bookingId: number, options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const [rideId, setRideId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selfRole = getAuthUserRole();
  const selfUserId = getAuthUserId();
  const seenIds = useRef(new Set<number>());

  const appendMessage = useCallback(
    (msg: RideMessage) => {
      if (!selfUserId || seenIds.current.has(msg.id)) return;
      seenIds.current.add(msg.id);
      setMessages((prev) => [...prev, toUiMessage(msg, selfUserId)]);
    },
    [selfUserId]
  );

  useEffect(() => {
    if (!enabled || !bookingId || !selfRole || !selfUserId) {
      setLoading(false);
      if (!selfRole || !selfUserId) setError("Not signed in");
      return;
    }

    let mounted = true;
    seenIds.current.clear();
    setMessages([]);
    setLoading(true);
    setError("");
    let unsubscribe = () => {};

    (async () => {
      try {
        const bookingRes = await api.getBookingWithRide(bookingId);
        const booking = (bookingRes as { data?: unknown }).data || bookingRes;
        const ride = (booking as { ride?: { id: number } }).ride;
        if (!ride?.id) {
          if (mounted) setError("No active ride for this booking");
          return;
        }

        const rid = ride.id;
        if (!mounted) return;
        setRideId(rid);

        unsubscribe = subscribeRideMessages((msg) => {
          if (mounted && msg.rideId === rid) appendMessage(msg);
        });

        await joinRideRoom(rid);
        if (!mounted) return;
        setConnected(true);

        const history = await api.getRideMessages(rid);
        if (!mounted) return;
        history.messages.forEach((m) => appendMessage(m));
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to connect chat");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [bookingId, enabled, selfRole, selfUserId, appendMessage]);

  const sendMessage = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text || !rideId || !selfRole || !selfUserId) return;
      const message = await sendRideMessage({
        rideId,
        senderUserId: selfUserId,
        senderRole: selfRole,
        body: text
      });

      appendMessage(message);
    },
    [rideId, selfRole, selfUserId, appendMessage]
  );

  const applyTranslations = useCallback((updates: Map<number, string>) => {
    setMessages((prev) =>
      prev.map((m) => (updates.has(m.id) ? { ...m, translated: updates.get(m.id) ?? null } : m))
    );
  }, []);

  return {
    rideId,
    messages,
    setMessages,
    applyTranslations,
    sendMessage,
    connected,
    loading,
    error,
    selfRole
  };
}
