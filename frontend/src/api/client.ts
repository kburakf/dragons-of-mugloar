import type {
  AdsResponse,
  BuyResult,
  ErrorBody,
  GameStart,
  Reputation,
  ShopItem,
  SolveResult,
} from './types';

// Remove a slash at the end, so that we can always add paths that start with a slash.
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3100/api').replace(
  /\/$/,
  '',
);

export class ApiError extends Error {
  constructor(
    message: string,
    // 0 when the server did not answer.
    readonly statusCode: number,
    // The error code of the backend, for example "GAME_OVER".
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readErrorBody(response: Response): Promise<Partial<ErrorBody>> {
  try {
    return (await response.json()) as Partial<ErrorBody>;
  } catch {
    return {};
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Cannot reach the game server. Check that the backend is running.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    const errorBody = await readErrorBody(response);

    throw new ApiError(
      errorBody.message ?? `The request failed (status ${response.status}).`,
      response.status,
      errorBody.error ?? 'HTTP_ERROR',
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      'The server sent an answer that we cannot read.',
      response.status,
      'BAD_BODY',
    );
  }
}

export function startGame(): Promise<GameStart> {
  return request('POST', '/games');
}

export function getAds(gameId: string): Promise<AdsResponse> {
  return request('GET', `/games/${encodeURIComponent(gameId)}/ads`);
}

export function solveAd(gameId: string, adId: string): Promise<SolveResult> {
  return request(
    'POST',
    `/games/${encodeURIComponent(gameId)}/ads/${encodeURIComponent(adId)}/solve`,
  );
}

export function getShop(gameId: string): Promise<ShopItem[]> {
  return request('GET', `/games/${encodeURIComponent(gameId)}/shop`);
}

export function buyItem(gameId: string, itemId: string): Promise<BuyResult> {
  return request(
    'POST',
    `/games/${encodeURIComponent(gameId)}/shop/${encodeURIComponent(itemId)}/buy`,
  );
}

export function investigateReputation(gameId: string): Promise<Reputation> {
  return request('POST', `/games/${encodeURIComponent(gameId)}/reputation`);
}
