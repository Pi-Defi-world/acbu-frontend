/**
 * Public backend config the frontend uses to discover what asset / network to
 * sign against. Kept in a tiny module of its own so callers can cache the
 * response: the assets don't change between requests within a session.
 */
import { get } from "./client";

export interface PublicAssetsConfig {
  acbu: { code: string; issuer: string | null };
  demo_fiat: { issuer: string | null };
  stellar: {
    network_passphrase: string;
    horizon_url: string | null;
  };
}

let cached: PublicAssetsConfig | null = null;
let inFlight: Promise<PublicAssetsConfig> | null = null;

export async function getAssetsConfig(): Promise<PublicAssetsConfig> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = get<PublicAssetsConfig>("/config/assets")
    .then((cfg) => {
      cached = cfg;
      return cfg;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function clearAssetsConfigCache(): void {
  cached = null;
}
