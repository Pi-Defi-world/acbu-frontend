import { normalizeUsername } from '../utils';
import { post } from './client';
import type { RequestOptions } from './client';
import type { SigninResponse, SigninRequires2FA } from '@/types/api';

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
  return post<SigninResponse | SigninRequires2FA>('/auth/signin', { identifier, passcode }, opts);
}

export async function verify2fa(
  challengeToken: string,
  code: string,
  opts?: RequestOptions
): Promise<SigninResponse> {
  return post<SigninResponse>('/auth/signin/verify-2fa', { challenge_token: challengeToken, code }, opts);
}

export async function signout(opts?: RequestOptions): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/auth/signout', undefined, opts);
}
