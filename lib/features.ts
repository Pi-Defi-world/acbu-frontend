/**
 * Client-side feature flags.
 *
 * Off by default for flows that aren't production-ready (e.g. the
 * international transfer tab on /currency, which still needs a dedicated
 * cross-border backend and per-corridor compliance wiring).
 */
export const featureFlags = {
  internationalTransfers: false,
} as const;
