import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the current locale from browser or fallback to 'en-US'
 */
export function getCurrentLocale(): string {
  if (typeof window !== 'undefined') {
    return navigator.language || 'en-US';
  }
  return 'en-US';
}

/**
 * Format a token amount with Stellar standards (7 decimals) and thousand-separators.
 * Uses current locale for proper grouping separators.
 * Falls back to "—" for null/undefined/invalid values.
 */
export function formatAmount(
  amount: string | number | null | undefined,
  decimals = 7,
  locale?: string,
): string {
  if (
    amount === null ||
    amount === undefined ||
    (typeof amount === "string" && amount.trim() === "")
  )
    return "—";

  const num = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(num)) return "—";

  return new Intl.NumberFormat(locale || getCurrentLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format currency amount with proper locale-aware formatting.
 * Uses current locale for proper grouping separators and currency formatting.
 */
export function formatCurrency(
  amount: string | number,
  currency: string,
  locale?: string,
): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return "";

  try {
    return new Intl.NumberFormat(locale || getCurrentLocale(), {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    // Fallback if currency formatting fails
    return `${value} ${currency}`;
  }
}

/**
 * Format a token amount with Stellar standards (7 decimals) and thousand-separators.
 * Falls back to "—" for null/undefined/invalid values.
 */
// export function formatAmount(
//   amount: string | number | null | undefined,
//   decimals = 7,
// ): string {
//   if (
//     amount === null ||
//     amount === undefined ||
//     (typeof amount === "string" && amount.trim() === "")
//   )
//     return "—";

//   const num = typeof amount === "string" ? Number(amount) : amount;
//   if (Number.isNaN(num)) return "—";

//   return new Intl.NumberFormat("en-US", {
//     minimumFractionDigits: 0,
//     maximumFractionDigits: decimals,
//   }).format(num);
// }

export const normalizeUsername = (input: string) => {
  return input.toLowerCase().trim();
}