/**
 * Prints how to reset the `dev` branch of the Neon database from prod. It runs nothing, so it
 * needs no Neon credentials.
 *
 *   pnpm db:reset:dev
 */
console.log(`Reset the dev database from prod, in the Neon console:
  Word Duel project → Branches → dev → Reset from parent

dev then holds prod's schema and data as they are now; everything written on dev is lost.
Then run \`pnpm db:migrate\` to apply any migration that hasn't reached prod yet.
(With the Neon CLI signed in, \`neonctl branches reset dev --parent\` does the same.)`);
