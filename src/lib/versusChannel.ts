import type { RoomSnapshot } from "@/game/versus";
import { roomChannel } from "@/game/versus";

/**
 * A browser's line to its room's Ably channel (ADR 0012), spoken in
 * Ably's realtime protocol over a plain WebSocket, so there is no SDK. The
 * browser listens for the server's snapshots and enters the channel's
 * presence, which is how the server knows this seat is still here; it never
 * publishes. The token comes from our server and allows only that. A dropped
 * connection (an expired token included) reconnects with a fresh token after
 * a short wait; Ably keeps a dropped seat present for 15 seconds, so a quick
 * reconnect is never seen as leaving.
 */
const REALTIME = "wss://realtime.ably.io/";
const RETRY_MS = 2_000;
/** Reconnect if nothing (not even a heartbeat) arrives for the server's idle interval plus this. */
const IDLE_GRACE_MS = 10_000;

/** Ably protocol message actions used here. */
const A = {
  heartbeat: 0,
  connected: 4,
  disconnected: 6,
  closed: 8,
  error: 9,
  attach: 10,
  attached: 11,
  detached: 13,
  presence: 14,
  message: 15,
  sync: 16,
} as const;
/** Presence actions. */
const P = { enter: 2, leave: 3 } as const;

interface ProtocolMessage {
  action: number;
  channel?: string;
  connectionDetails?: { maxIdleInterval?: number };
  messages?: { name?: string; data?: unknown }[];
  presence?: { action: number; clientId?: string }[];
}

export function listenToRoom(
  code: string,
  getToken: () => Promise<string | null>,
  handlers: {
    onSnapshot: (s: RoomSnapshot) => void;
    /** Someone else's presence left the channel: the server may want to know. */
    onLeave: () => void;
    onOpen: (open: boolean) => void;
  },
): () => void {
  const channel = roomChannel(code);
  let socket: WebSocket | null = null;
  let retry: number | undefined;
  let idle: number | undefined;
  let idleMs = 15_000;
  let stopped = false;

  const drop = () => {
    window.clearTimeout(idle);
    if (socket) {
      socket.onclose = socket.onmessage = socket.onerror = null;
      socket.close();
      socket = null;
    }
    handlers.onOpen(false);
  };

  const reconnect = () => {
    drop();
    if (!stopped) retry = window.setTimeout(connect, RETRY_MS);
  };

  /** Any message proves the line is alive; silence past the idle interval means it isn't. */
  const alive = () => {
    window.clearTimeout(idle);
    idle = window.setTimeout(reconnect, idleMs + IDLE_GRACE_MS);
  };

  const send = (m: object) => socket?.send(JSON.stringify(m));

  const onMessage = (m: ProtocolMessage, mine: string | null) => {
    switch (m.action) {
      case A.connected:
        if (m.connectionDetails?.maxIdleInterval) idleMs = m.connectionDetails.maxIdleInterval;
        send({ action: A.attach, channel });
        break;
      case A.attached:
        if (m.channel !== channel) break;
        send({ action: A.presence, channel, msgSerial: 0, presence: [{ action: P.enter }] });
        handlers.onOpen(true);
        break;
      case A.message:
        for (const msg of m.messages ?? []) {
          if (msg.name !== "room") continue;
          try {
            handlers.onSnapshot((typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data) as RoomSnapshot);
          } catch {
            // Not a snapshot; ignore it.
          }
        }
        break;
      case A.presence:
      case A.sync:
        if (m.presence?.some((p) => p.action === P.leave && p.clientId !== mine)) handlers.onLeave();
        break;
      case A.disconnected:
      case A.closed:
      case A.error:
      case A.detached:
        reconnect();
        break;
    }
  };

  async function connect() {
    const token = await getToken().catch(() => null);
    if (stopped) return;
    if (!token) {
      retry = window.setTimeout(connect, RETRY_MS);
      return;
    }
    const url = `${REALTIME}?v=2&format=json&heartbeats=true&access_token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    socket = ws;
    // This seat's own presence id, so its own comings and goings are ignored.
    let mine: string | null = null;
    ws.onmessage = (e) => {
      alive();
      try {
        const m = JSON.parse(e.data as string) as ProtocolMessage & { connectionDetails?: { clientId?: string } };
        if (m.action === A.connected) mine = m.connectionDetails?.clientId ?? null;
        if (m.action !== A.heartbeat) onMessage(m, mine);
      } catch {
        // Not JSON; ignore it.
      }
    };
    ws.onclose = reconnect;
    ws.onerror = reconnect;
    alive();
  }

  connect();
  return () => {
    stopped = true;
    window.clearTimeout(retry);
    drop();
  };
}
