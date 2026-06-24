import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiError } from '../use-api-error';
import type { ApiError } from '@/lib/api/client';

function makeApiError(status: number, message: string): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}

describe('useApiError', () => {
  it('starts with an empty error string', () => {
    const { result } = renderHook(() => useApiError());
    expect(result.current.uiError?.message ?? '').toBe('');
  });

  it('clearError resets the error to empty', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(new Error('oops')));
    expect(result.current.uiError?.message ?? '').not.toBe('');
    act(() => result.current.clearError());
    expect(result.current.uiError?.message ?? '').toBe('');
  });

  it('setError sets an arbitrary message', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(new Error('custom message')));
    expect(result.current.uiError?.message ?? '').toBe('custom message');
  });

  // --- handleError maps the three special codes ---

  it('handleError maps HTTP 429 to the rate-limit message', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(makeApiError(429, 'rate limited')));
    expect(result.current.uiError?.message ?? '').toBe(
      'Too many requests. Please wait a moment before trying again.',
    );
  });

  it('handleError maps HTTP 503 to the service-unavailable message', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(makeApiError(503, 'down')));
    expect(result.current.uiError?.message ?? '').toBe(
      'Our payment processor is temporarily down. Your funds are safe.',
    );
  });

  it('handleError maps HTTP 402 to the payment-required message', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(makeApiError(402, 'upgrade')));
    expect(result.current.uiError?.message ?? '').toBe(
      'Insufficient balance or payment required.',
    );
  });

  // --- handleError falls back for other codes ---

  it('handleError passes through the message for 400', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(makeApiError(400, 'bad request')));
    expect(result.current.uiError?.message ?? '').toBe('bad request');
  });

  it('handleError passes through the message for 500', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(makeApiError(500, 'server error')));
    expect(result.current.uiError?.message ?? '').toBe('server error');
  });

  it('handleError handles a plain Error with no status', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(new Error('network failure')));
    expect(result.current.uiError?.message ?? '').toBe('network failure');
  });

  it('handleError handles null gracefully', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setApiError(null as unknown));
    expect(result.current.uiError?.message ?? '').toBe('Something went wrong. Please try again.');
  });
});
