import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a token amount with Stellar standards (7 decimals) and thousand-separators.
 * Falls back to "—" for null/undefined/invalid values.
 */
export function formatAmount(
  amount: string | number | null | undefined,
  decimals = 7,
): string {
  if (
    amount === null ||
    amount === undefined ||
    (typeof amount === "string" && amount.trim() === "")
  )
    return "—";

  const num = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(num)) return "—";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}
