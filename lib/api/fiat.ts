import { get, post } from './client';
import type { RequestOptions } from './client';

export interface FiatAccount {
  id: string;
  currency: string;
  balance: string | number;
  bank_name: string;
  account_number: string;
  account_name: string;
}

export async function getFiatAccounts(opts?: RequestOptions): Promise<{ accounts: FiatAccount[] }> {
  return get('/fiat/accounts', opts);
}

export async function postFaucet(currency: string, opts?: RequestOptions): Promise<{ message: string }> {
  return post('/fiat/faucet', { currency }, opts);
}

export async function postOnRamp(amount: string, currency: string, opts?: RequestOptions): Promise<{ transaction_id: string; message: string }> {
  return post('/fiat/on-ramp', { amount, currency }, opts);
}

export async function postOffRamp(amount_acbu: string, currency: string, opts?: RequestOptions): Promise<{ transaction_id: string; message: string }> {
  return post('/fiat/off-ramp', { amount_acbu, currency }, opts);
}
