# Accounts live in our own Postgres, signed in with OAuth through Better Auth

Signing in adds the game's first backend. The game stays fully playable as a **guest**: signing in only adds features (progress that follows the player across devices, word history).

- **Database**: Postgres, provisioned as Neon through the Vercel Marketplace on the existing Vercel project. Schema and migrations are Drizzle, kept in the repo.
- **Auth**: Better Auth, OAuth only (Google, GitHub, Discord), no passwords. Users, sessions and linked provider accounts are rows in our own database, not in a hosted auth service.
- **Guest data**: guests keep using localStorage. On sign-in, the browser's guest progress is merged into the account (the higher best score wins; word history is added), and from then on the account is the source of truth while signed in.

## Why

Vercel may not be the long-term host. Plain Postgres plus a library that stores auth in our own tables means leaving Vercel is a connection-string change and a data dump, not an auth migration. Hosted auth (Clerk) and Supabase auth were rejected for that lock-in, and because drop-in auth widgets clash with the pixel style; the sign-in screens are ours.
