import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Development mode: the same env files as `pnpm dev`, so db:generate and db:migrate reach dev.
loadEnvConfig(process.cwd(), true);

export default defineConfig({
  schema: "./src/server/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations use the direct (unpooled) connection when Neon provides one.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
