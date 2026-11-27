/** OAuth providers offered on the sign-in panel, in the order shown (ADR 0006). */
export const PROVIDERS = ["google", "github", "discord"] as const;

export type ProviderId = (typeof PROVIDERS)[number];
