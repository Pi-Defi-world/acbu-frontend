import { useState, useCallback } from "react";
import type { ApiError } from "@/lib/api/client";

/**
 * Strict shape of an API error response from the backend.
 */
export interface ApiErrorResponse {
  status?: number;
  message?: string;
  details?: unknown;
}

/**
 * A mapped UI error with a human-readable message and an optional recovery action.
 */
export interface UIError {
  message: string;
  action?: UIErrorAction;
}

export interface UIErrorAction {
  label: string;
  /** If set, render as a link. */
  href?: string;
  /** If set, call this when the action button is clicked. */
  onClick?: () => void;
  /** If true, the submit button should be disabled until this resolves. */
  disableSubmitFor?: number; // milliseconds
}

/**
 * Maps an API error status code to a user-friendly UIError.
 * Returns null for null/undefined input so callers can safely pass any caught value.
 */
export function mapApiError(err: unknown): UIError | null {
  if (err == null) return null;

  const status =
    (err as ApiError).status ??
    (err as ApiErrorResponse).status ??
    undefined;

  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof (err as ApiErrorResponse).message === "string"
        ? (err as ApiErrorResponse).message
        : undefined;

  switch (status) {
    case 429:
      return {
        message: "Too many requests. Please wait a moment before trying again.",
        action: {
          label: "Wait and retry",
          disableSubmitFor: 30_000,
        },
      };
    case 503:
      return {
        message:
          "Our payment processor is temporarily down. Your funds are safe.",
        action: {
          label: "Check status page",
          href: "https://status.acbu.io",
        },
      };
    case 402:
      return {
        message: "Insufficient balance or payment required.",
        action: {
          label: "Deposit funds",
          href: "/savings/deposit",
        },
      };
    default:
      return {
        message: rawMessage ?? "Something went wrong. Please try again.",
      };
  }
}

/**
 * Hook that manages a UIError state derived from raw API errors.
 *
 * Usage:
 *   const { uiError, setApiError, clearError, isSubmitDisabled } = useApiError();
 *
 *   catch (e) { setApiError(e); }
 *
 *   {uiError && <ApiErrorDisplay error={uiError} onDismiss={clearError} />}
 */
export function useApiError() {
  const [uiError, setUiError] = useState<UIError | null>(null);
  const [submitDisabledUntil, setSubmitDisabledUntil] = useState<number>(0);

  const setApiError = useCallback((err: unknown) => {
    const mapped = mapApiError(err);
    setUiError(mapped);
    if (mapped?.action?.disableSubmitFor) {
      setSubmitDisabledUntil(Date.now() + mapped.action.disableSubmitFor);
    }
  }, []);

  const clearError = useCallback(() => {
    setUiError(null);
    setSubmitDisabledUntil(0);
  }, []);

  const isSubmitDisabled = submitDisabledUntil > Date.now();

  return { uiError, setApiError, clearError, isSubmitDisabled };
}
