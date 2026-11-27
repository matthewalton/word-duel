import type { RoomSnapshot } from "@/game/versus";
import { roomChannel } from "@/game/versus";

/**
 * Listens to a room's Ably channel over server-sent events (ADR 0012): the
 * browser only subscribes, with a token from our server that allows nothing
 * else. A dropped connection (an expired token included) reconnects with a
 * fresh token after a short wait.
 */
const SSE = "https://realtime.ably.io/sse";
const RETRY_MS = 2_000;

export function listenToRoom(
  code: string,
  getToken: () => Promise<string | null>,
  onSnapshot: (s: RoomSnapshot) => void,
  onOpen: (open: boolean) => void,
): () => void {
  let source: EventSource | null = null;
  let retry: number | undefined;
  let stopped = false;

  const connect = async () => {
    const token = await getToken().catch(() => null);
    if (stopped) return;
    if (!token) {
      retry = window.setTimeout(connect, RETRY_MS);
      return;
    }
    const url = `${SSE}?v=1.2&channels=${encodeURIComponent(roomChannel(code))}&accessToken=${encodeURIComponent(token)}`;
    source = new EventSource(url);
    source.onopen = () => onOpen(true);
    source.onmessage = (e) => {
      try {
        const message = JSON.parse(e.data) as { name?: string; data?: unknown };
        if (message.name !== "room") return;
        const data = typeof message.data === "string" ? JSON.parse(message.data) : message.data;
        onSnapshot(data as RoomSnapshot);
      } catch {
        // Not a snapshot; ignore it.
      }
    };
    source.onerror = () => {
      onOpen(false);
      source?.close();
      source = null;
      if (!stopped) retry = window.setTimeout(connect, RETRY_MS);
    };
  };

  connect();
  return () => {
    stopped = true;
    window.clearTimeout(retry);
    source?.close();
    onOpen(false);
  };
}
