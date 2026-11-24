import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { getDb } from "./db";
import * as schema from "./schema";

const ENV_PREFIX: Record<ProviderId, string> = {
  google: "GOOGLE",
  github: "GITHUB",
  discord: "DISCORD",
};

/** Providers whose client id and secret are set; the rest are left out. */
function socialProviders() {
  const out: Partial<Record<ProviderId, { clientId: string; clientSecret: string }>> = {};
  for (const id of PROVIDERS) {
    const clientId = process.env[`${ENV_PREFIX[id]}_CLIENT_ID`];
    const clientSecret = process.env[`${ENV_PREFIX[id]}_CLIENT_SECRET`];
    if (clientId && clientSecret) out[id] = { clientId, clientSecret };
  }
  return out;
}

function create() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    socialProviders: socialProviders(),
    // Signing in with a second provider that has the same verified email
    // joins the existing account instead of making a new one. A signed-in
    // player can also link a provider with a different email from the account
    // menu; one that already has its own user is refused (ADR 0006).
    account: {
      accountLinking: { enabled: true, trustedProviders: [...PROVIDERS], allowDifferentEmails: true },
    },
  });
}

let instance: ReturnType<typeof create> | undefined;

/** Better Auth, created on first use so builds don't need the database. */
export function getAuth() {
  instance ??= create();
  return instance;
}

/** The signed-in user's id for this request, or null for a guest. */
export async function currentUserId(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}
