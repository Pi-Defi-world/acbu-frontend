import { normalizeUsername } from '@/lib/utils';
import { post } from './client';
import type { RequestOptions } from './client';
import type { SigninResponse, SigninRequires2FA } from '@/types/api';
import { setAuth } from '@/contexts/auth-context';

export interface SignupResponse {
  user_id: string;
  message: string;
}

export async function signup(
  username: string,
  passcode: string,
  opts?: RequestOptions
): Promise<SignupResponse> {
  const normalizedUsername = normalizeUsername(username);

  return post<SignupResponse>(
    '/auth/signup',
    { username: normalizedUsername, passcode },
    opts
  );
}

export async function signin(
  identifier: string,
  passcode: string,
  opts?: RequestOptions
): Promise<SigninResponse | SigninRequires2FA> {
  const response = await post<SigninResponse | SigninRequires2FA>(
    '/auth/signin',
    { identifier, passcode },
    opts
  );
  if ('api_key' in response && response.api_key) {
    setAuth(response.api_key, response.user_id, response.username);
  }
  return response;
}

export async function verify2fa(
  challengeToken: string,
  code: string,
  opts?: RequestOptions
): Promise<SigninResponse> {
  const response = await post<SigninResponse>(
    '/auth/signin/verify-2fa',
    { challenge_token: challengeToken, code },
    opts
  );
  setAuth(response.api_key, response.user_id, response.username);
  return response;
}

export async function exchangeOAuthCode(
  code: string,
  state: string,
  opts?: RequestOptions
): Promise<SigninResponse> {
  const response = await post<SigninResponse>(
    '/auth/oauth/callback',
    { code, state },
    opts
  );
  setAuth(response.api_key, response.user_id, response.username);
  return response;
}

export async function signout(opts?: RequestOptions): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/auth/signout', undefined, opts);
}
