import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Invariant function that throws an error if the condition is falsy.
 * Use this instead of console.assert for invariant checks in production.
 */
export function invariant(
  condition: unknown,
  message?: string
): asserts condition {
  if (!condition) {
    throw new Error(message ?? "Invariant violation");
  }
}

type NumberLocale = string | string[];

/**
 * Resolve the active number formatting locale.
 * Priority:
 *  1. Explicit locale passed by caller
 *  2. In-app chosen route/document locale (<html lang="...">)
 *  3. In-app chosen stored locale or NEXT_LOCALE cookie
 *  4. Browser language (navigator.languages / navigator.language)
 */
function resolveNumberLocale(locale?: NumberLocale): NumberLocale | undefined {
  if (locale) return locale;

  if (typeof document !== "undefined") {
    const docLang = document.documentElement?.getAttribute("lang")?.trim();
    if (docLang) return docLang;

    // Check NEXT_LOCALE cookie if available
    const cookieMatch = document.cookie?.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (cookieMatch?.[1]) {
      try {
        const decoded = decodeURIComponent(cookieMatch[1]).trim();
        if (decoded) return decoded;
      } catch {
        // malformed cookie encoding
      }
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem("acbu_locale")?.trim();
      if (stored) return stored;
    } catch {
      // Storage unavailable
    }
  }

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

/**
 * Safe conversion of UTC timestamp strings from the API (which may lack a trailing Z or timezone indicator)
 * into a local Date object, ensuring the user's local timezone offset is applied.
 */
export function parseUtcDate(iso: string | null | undefined): Date {
  if (!iso) return new Date();
  const trimmed = String(iso).trim();
  const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const utcString = hasTimezone ? trimmed : (trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed) + 'Z';
  return new Date(utcString);
}

