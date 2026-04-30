import { Asset } from "@stellar/stellar-sdk";

export const DEMO_FIAT_ISSUER =
  process.env.NEXT_PUBLIC_DEMO_FIAT_ISSUER ??
  // Default to current dev issuer used by backend (.env STELLAR_ACBU_ASSET_ISSUER)
  "GDHO63RZEUNDRVF6WA7HD4D7PLNLUMSK5H74ONW3MEF3VKF4BZJ6GDML";

export const ACBU_ASSET_CODE = (
  process.env.NEXT_PUBLIC_ACBU_ASSET_CODE ?? "ACBU"
)
  .trim()
  .toUpperCase();

export const ACBU_ASSET_ISSUER =
  process.env.NEXT_PUBLIC_ACBU_ASSET_ISSUER ?? DEMO_FIAT_ISSUER;

export function demoFiatAsset(currency: string): Asset {
  const code = currency.trim().toUpperCase();
  return new Asset(code, DEMO_FIAT_ISSUER);
}

export function acbuAsset(): Asset {
  return new Asset(ACBU_ASSET_CODE, ACBU_ASSET_ISSUER);
}

