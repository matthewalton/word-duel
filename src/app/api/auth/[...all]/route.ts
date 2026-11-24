import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";

const handle = (request: Request) => {
  // Without a database (a fresh clone, no .env.local) everyone is a guest:
  // answer quietly instead of throwing on every session check.
  if (!process.env.DATABASE_URL)
    return Promise.resolve(
      Response.json({ message: "Accounts are not set up. See README: Accounts." }, { status: 503 }),
    );
  return getAuth().handler(request);
};

export const { GET, POST } = toNextJsHandler(handle);
