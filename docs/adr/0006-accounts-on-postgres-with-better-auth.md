# Accounts live in our own Postgres, signed in with OAuth through Better Auth

Signing in adds the game's first backend. The game stays fully playable as a **guest**: signing in only adds features (progress that follows the player across devices, word history).

- **Database**: Postgres, provisioned as Neon through the Vercel Marketplace on the existing Vercel project. Schema and migrations are Drizzle, kept in the repo.
- **Auth**: Better Auth, OAuth only (Google, GitHub, Discord), no passwords. Users, sessions and linked provider accounts are rows in our own database, not in a hosted auth service. A provider joins an existing account when it reports the same verified email, or when a signed-in player links it from the account menu. Linking a provider that already has its own account is refused rather than merging the two users.
- **Guest data**: guests keep using localStorage. While signed in, any guest progress in the browser is merged into the account and then deleted from the browser: a guest best score only fills a minigame the account has no score for, so an account best is never replaced (a shared browser can't overwrite it); word history is added. The account is the source of truth while signed in, and nothing is written to the browser. After signing out, the browser tracks guest progress again from zero.

## Why

Vercel may not be the long-term host. Plain Postgres plus a library that stores auth in our own tables means leaving Vercel is a connection-string change and a data dump, not an auth migration. Hosted auth (Clerk) and Supabase auth were rejected for that lock-in, and because drop-in auth widgets clash with the pixel style; the sign-in screens are ours.
