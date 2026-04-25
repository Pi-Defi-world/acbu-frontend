import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type NumberLocale = string | string[];

function resolveNumberLocale(locale?: NumberLocale): NumberLocale | undefined {
  if (locale) return locale;
  if (typeof navigator === "undefined") return undefined;

  return navigator.languages?.length
    ? Array.from(navigator.languages)
    : navigator.language;
}

function formatNumber(
  amount: string | number | null | undefined,
  {
    locale,
    minimumFractionDigits = 0,
    maximumFractionDigits,
  }: {
    locale?: NumberLocale;
    minimumFractionDigits?: number;
    maximumFractionDigits: number;
  },
): string {
  if (
    amount === null ||
    amount === undefined ||
    (typeof amount === "string" && amount.trim() === "")
  ) {
    return "—";
  }

  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(num)) return "—";

  return new Intl.NumberFormat(resolveNumberLocale(locale), {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num);
}

/**
 * Format a token amount with Stellar standards (7 decimals) and thousand-separators.
 * Falls back to "—" for null/undefined/invalid values.
 */
export function formatAmount(
  amount: string | number | null | undefined,
  decimals = 7,
  locale?: NumberLocale,
): string {
  return formatNumber(amount, {
    locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format an ACBU amount with locale-aware grouping and up to 7 decimals.
 */
export function formatAcbu(
  amount: string | number | null | undefined,
  locale?: NumberLocale,
): string {
  return formatNumber(amount, {
    locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  });
}

export const normalizeUsername = (input: string) => {
  return input.toLowerCase().trim();
}
