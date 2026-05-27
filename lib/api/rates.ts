import { get } from './client';
import type { RequestOptions } from './client';
import type { RatesResponse, QuoteResponse } from '@/types/api';

const RATES_TTL_MS = 60_000; // 1 minute

let cachedRates: RatesResponse | null = null;
let cacheToken: string | undefined;
let cacheExpiry = 0;

export async function getRates(opts?: RequestOptions): Promise<RatesResponse> {
  const now = Date.now();
  if (cachedRates && opts?.token === cacheToken && now < cacheExpiry) {
    return cachedRates;
  }
  const data = await get<RatesResponse>('/rates', opts);
  cachedRates = data;
  cacheToken = opts?.token;
  cacheExpiry = now + RATES_TTL_MS;
  return data;
}

export async function getQuote(
  amount: number | string,
  currency?: string,
  opts?: RequestOptions
): Promise<QuoteResponse> {
  const params = new URLSearchParams({ amount: String(amount) });
  if (currency) params.set('currency', currency);
  return get<QuoteResponse>(`/rates/quote?${params.toString()}`, opts);
}
