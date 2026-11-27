import "server-only";

/**
 * Ably over its REST API (ADR 0012): the server publishes room snapshots and
 * hands browsers short-lived tokens that may only subscribe to their room's
 * channel. No SDK: two HTTP calls cover it, and browsers listen over
 * server-sent events.
 */
const REST = "https://rest.ably.io";
/** The server publishes as an identified client, which the key requires. */
const SERVER_CLIENT_ID = "server";
/** Longer than any match; a browser asks for a new token if its connection drops. */
const TOKEN_TTL_MS = 60 * 60_000;

function apiKey(): string {
  const key = process.env.ABLY_API_KEY;
  if (!key) throw new Error("ABLY_API_KEY is not set. See README: Accounts.");
  return key;
}

const auth = (key: string) => `Basic ${Buffer.from(key).toString("base64")}`;

/** Publishes one message whose data is JSON. Throws if Ably refuses it. */
export async function publish(channel: string, name: string, data: unknown): Promise<void> {
  const key = apiKey();
  const res = await fetch(`${REST}/channels/${encodeURIComponent(channel)}/messages`, {
    method: "POST",
    headers: {
      authorization: auth(key),
      "content-type": "application/json",
      "x-ably-clientid": Buffer.from(SERVER_CLIENT_ID).toString("base64"),
    },
    body: JSON.stringify({ name, data: JSON.stringify(data) }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Ably publish failed: ${res.status}`);
}

/**
 * A token that may subscribe to one channel and nothing else. The key needs
 * every client identified, so the token carries `clientId` (a room seat).
 */
export async function subscribeToken(channel: string, clientId: string): Promise<{ token: string; expires: number }> {
  const key = apiKey();
  const keyName = key.split(":")[0];
  const res = await fetch(`${REST}/keys/${encodeURIComponent(keyName)}/requestToken`, {
    method: "POST",
    headers: { authorization: auth(key), "content-type": "application/json" },
    body: JSON.stringify({
      keyName,
      capability: JSON.stringify({ [channel]: ["subscribe"] }),
      clientId,
      ttl: TOKEN_TTL_MS,
      timestamp: Date.now(),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Ably token request failed: ${res.status}`);
  const body = (await res.json()) as { token: string; expires: number };
  return { token: body.token, expires: body.expires };
}
