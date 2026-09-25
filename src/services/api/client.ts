import type { z } from 'zod';

import { API_URL } from '@/lib/config';

import { getAccessToken, refreshSession } from '../session';
import { ApiError, NetworkError } from './errors';

type RequestOptions<S extends z.ZodType | undefined> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Parses (and types) the response body. Omit for endpoints that return 204. */
  schema?: S;
  /** Attach the access token and transparently refresh it on 401. Default true. */
  auth?: boolean;
  signal?: AbortSignal;
};

type Result<S> = S extends z.ZodType ? z.output<S> : void;

const TIMEOUT_MS = 15_000;

function buildUrl(path: string, query?: RequestOptions<undefined>['query']) {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${API_URL}${path}${params ? `?${params}` : ''}`;
}

async function send(url: string, init: RequestInit, token: string | null, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timeout);
  }
}

export async function request<S extends z.ZodType | undefined = undefined>(
  path: string,
  { method = 'GET', body, query, schema, auth = true, signal }: RequestOptions<S> = {},
): Promise<Result<S>> {
  const url = buildUrl(path, query);
  const init: RequestInit = { method, body: body === undefined ? undefined : JSON.stringify(body) };

  let token = auth ? getAccessToken() : null;
  // Cold start: we have a refresh token but no access token yet.
  if (auth && !token) token = (await refreshSession()).tokens.accessToken;

  let response = await send(url, init, token, signal);
  if (auth && response.status === 401) {
    token = (await refreshSession()).tokens.accessToken;
    response = await send(url, init, token, signal);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; details?: unknown };
    } | null;
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'HTTP_ERROR',
      payload?.error?.message ?? `Request failed (${response.status})`,
      payload?.error?.details,
    );
  }

  if (!schema || response.status === 204) return undefined as Result<S>;
  return schema.parse(await response.json()) as Result<S>;
}
