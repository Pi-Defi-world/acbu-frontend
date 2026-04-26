import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiError } from '../use-api';
import type { ApiError } from '@/lib/api/client';

function makeApiError(status: number, message: string): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}

describe('useApiError', () => {
  it('starts with an empty error string', () => {
    const { result } = renderHook(() => useApiError());
    expect(result.current.error).toBe('');
  });

  it('clearError resets the error to empty', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.handleError(new Error('oops')));
    expect(result.current.error).not.toBe('');
    act(() => result.current.clearError());
    expect(result.current.error).toBe('');
  });

  it('setError sets an arbitrary message', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.setError('custom message'));
    expect(result.current.error).toBe('custom message');
  });

  // --- handleError maps the three special codes ---

  it('handleError maps HTTP 429 to the rate-limit message', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.handleError(makeApiError(429, 'rate limited')));
    expect(result.current.error).toBe(
      'Too many requests — please wait a moment and try again.',
    );
  });

  it('handleError maps HTTP 503 to the service-unavailable message', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.handleError(makeApiError(503, 'down')));
    expect(result.current.error).toBe(
      'Service temporarily unavailable. Please try again in a few minutes.',
    );
  });

  it('handleError maps HTTP 402 to the payment-required message', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.handleError(makeApiError(402, 'upgrade')));
    expect(result.current.error).toBe(
      'Payment required — your account may need funding or a plan upgrade before proceeding.',
    );
  });

  // --- handleError falls back for other codes ---

  it('handleError passes through the message for 400', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.handleError(makeApiError(400, 'bad request')));
    expect(result.current.error).toBe('bad request');
  });

  it('handleError passes through the message for 500', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.handleError(makeApiError(500, 'server error')));
    expect(result.current.error).toBe('server error');
  });

  it('handleError handles a plain Error with no status', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.handleError(new Error('network failure')));
    expect(result.current.error).toBe('network failure');
  });

  it('handleError handles null gracefully', () => {
    const { result } = renderHook(() => useApiError());
    act(() => result.current.handleError(null));
    expect(result.current.error).toBe('Something went wrong');
  });
});
