/**
 * Public backend config the frontend uses to discover what asset / network to
 * sign against. Kept in a tiny module of its own so callers can cache the
 * response: the assets don't change between requests within a session.
 */
import { get } from "./client";
import type { RequestOptions } from "./client";

export interface PublicAssetsConfig {
  acbu: { code: string; issuer: string | null };
  demo_fiat: { issuer: string | null };
  stellar: {
    network_passphrase: string;
    horizon_url: string | null;
    soroban_rpc_url?: string | null;
  };
  contracts?: {
    burning?: string | null;
  };
  fees?: {
    mint_network_fee_text?: string | null;
    burn_processing_fee_text?: string | null;
    transfer_network_fee_text?: string | null;
    mint?: {
      network_fee_text?: string | null;
      fee_text?: string | null;
    } | null;
    burn?: {
      processing_fee_text?: string | null;
      fee_text?: string | null;
    } | null;
    transfer?: {
      network_fee_text?: string | null;
      fee_text?: string | null;
    } | null;
  } | null;
}

let cached: PublicAssetsConfig | null = null;
let inFlight: Promise<PublicAssetsConfig> | null = null;

export async function getAssetsConfig(opts?: Pick<RequestOptions, 'signal'>): Promise<PublicAssetsConfig> {
  if (cached) return cached;
  // If an in-flight request exists and no abort signal was provided, reuse it.
  // If a signal is provided, start a fresh request so the caller can abort it independently.
  if (inFlight && !opts?.signal) return inFlight;
  const promise = get<PublicAssetsConfig>("/config/assets", opts)
    .then((cfg) => {
      cached = cfg;
      return cfg;
    })
    .finally(() => {
      if (inFlight === promise) inFlight = null;
    });
  if (!opts?.signal) inFlight = promise;
  return promise;
}

export function clearAssetsConfigCache(): void {
  cached = null;
  inFlight = null;
}
