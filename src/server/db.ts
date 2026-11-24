import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See README: Accounts.");
  return drizzle(neon(url), { schema });
}

let instance: ReturnType<typeof connect> | undefined;

/** The database, connected on first use so builds don't need DATABASE_URL. */
export function getDb() {
  instance ??= connect();
  return instance;
}
