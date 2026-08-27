import type { PublicAssetsConfig } from '@/lib/api/config';

const FALLBACK_FEE_TEXT = {
  mintNetwork: 'Estimated at confirmation',
  burnProcessing: 'Estimated at confirmation',
  transferNetwork: 'Free',
} as const;

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const text = value?.trim();
    if (text) return text;
  }
  return null;
}

export function getMintNetworkFeeText(config: PublicAssetsConfig | null): string {
  return (
    firstText(
      config?.fees?.mint_network_fee_text,
      config?.fees?.mint?.network_fee_text,
      config?.fees?.mint?.fee_text,
    ) ?? FALLBACK_FEE_TEXT.mintNetwork
  );
}

export function getBurnProcessingFeeText(config: PublicAssetsConfig | null): string {
  return (
    firstText(
      config?.fees?.burn_processing_fee_text,
      config?.fees?.burn?.processing_fee_text,
      config?.fees?.burn?.fee_text,
    ) ?? FALLBACK_FEE_TEXT.burnProcessing
  );
}

export function getTransferNetworkFeeText(config: PublicAssetsConfig | null): string {
  return (
    firstText(
      config?.fees?.transfer_network_fee_text,
      config?.fees?.transfer?.network_fee_text,
      config?.fees?.transfer?.fee_text,
    ) ?? FALLBACK_FEE_TEXT.transferNetwork
  );
}
