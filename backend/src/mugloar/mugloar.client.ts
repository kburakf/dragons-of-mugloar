import { HttpStatus, Logger } from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { decodeAd } from './decode';
import {
  AdNotFoundError,
  GameNotFoundError,
  GameOverError,
  RateLimitedError,
  UpstreamNetworkError,
  UpstreamServerError,
  UpstreamTimeoutError,
  UpstreamUnavailableError,
} from './mugloar.errors';
import {
  Ad,
  BuyResult,
  GameStart,
  RawAd,
  Reputation,
  ShopItem,
  SolveResult,
} from './mugloar.schemas';

export interface MugloarClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  maxAttempts?: number;
  // The first retry waits this long. Each next retry waits twice as long.
  retryDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_RETRY_DELAY_MS = 1_000;
// Each retry waits this many times longer than the retry before it.
const RETRY_BACKOFF_FACTOR = 2;

// The only code that talks HTTP to the Dragons of Mugloar game API.
export class MugloarClient {
  private readonly logger = new Logger(MugloarClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;

  constructor(options: MugloarClientOptions) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

  startGame(): Promise<GameStart> {
    return this.request('POST', '/game/start', (json) => toInstance(GameStart, json), false);
  }

  async getAds(gameId: string): Promise<Ad[]> {
    const rawAds = await this.request(
      'GET',
      `/${encodeURIComponent(gameId)}/messages`,
      (json) => toInstances(RawAd, json),
      false,
    );

    return rawAds.map(decodeAd);
  }

  solveAd(gameId: string, adId: string): Promise<SolveResult> {
    const path = `/${encodeURIComponent(gameId)}/solve/${encodeURIComponent(adId)}`;

    return this.request('POST', path, (json) => toInstance(SolveResult, json), true);
  }

  getShop(gameId: string): Promise<ShopItem[]> {
    return this.request(
      'GET',
      `/${encodeURIComponent(gameId)}/shop`,
      (json) => toInstances(ShopItem, json),
      false,
    );
  }

  buyItem(gameId: string, itemId: string): Promise<BuyResult> {
    const path = `/${encodeURIComponent(gameId)}/shop/buy/${encodeURIComponent(itemId)}`;

    return this.request('POST', path, (json) => toInstance(BuyResult, json), true);
  }

  investigateReputation(gameId: string): Promise<Reputation> {
    const path = `/${encodeURIComponent(gameId)}/investigate/reputation`;

    return this.request('POST', path, (json) => toInstance(Reputation, json), true);
  }

  // Sends the request. Retries an error that is safe to retry. The last attempt throws any error.
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    parse: (json: unknown) => T,
    spendsTurn: boolean,
  ): Promise<T> {
    for (let attempt = 1; attempt < this.maxAttempts; attempt++) {
      try {
        return await this.sendOnce(method, path, parse);
      } catch (error) {
        if (!isRetryable(error, spendsTurn)) {
          throw error;
        }

        // isRetryable returns true only for our own error classes, so error is an Error here.
        await this.waitBeforeRetry(attempt, (error as Error).message);
      }
    }

    return this.sendOnce(method, path, parse);
  }

  // Sends the request one time and turns every failure into a typed error.
  private async sendOnce<T>(
    method: 'GET' | 'POST',
    path: string,
    parse: (json: unknown) => T,
  ): Promise<T> {
    let status: HttpStatus;
    let body: string;

    try {
      const response = await fetch(this.baseUrl + path, {
        method,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      status = response.status;
      body = await response.text();
    } catch (error) {
      throw isTimeout(error) ? new UpstreamTimeoutError() : new UpstreamNetworkError();
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      throw new RateLimitedError();
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      throw new UpstreamServerError(status);
    }

    return parseResponse(status, body, parse);
  }

  private async waitBeforeRetry(attempt: number, reason: string): Promise<void> {
    const delayMs = this.retryDelayMs * RETRY_BACKOFF_FACTOR ** (attempt - 1);

    this.logger.warn(`Game API request failed (${reason}). Retry ${attempt} in ${delayMs} ms.`);
    await sleep(delayMs);
  }
}

function isRetryable(error: unknown, spendsTurn: boolean): boolean {
  // 429 means that the server did not do the action, so a retry is safe.
  if (error instanceof RateLimitedError) {
    return true;
  }

  // A 5xx from a proxy does not prove that the server did not do the action.
  // A retried solve can then spend one more turn.
  // We accept that cost: in this game it is small, and it keeps a long bot run alive.
  // A bank transfer would need an idempotency key instead.
  if (error instanceof UpstreamServerError) {
    return true;
  }

  // A solve, buy or reputation request can reach the server even when we get no answer.
  // A second send could spend a second turn, so we report the error and do not retry.
  if (error instanceof UpstreamNetworkError || error instanceof UpstreamTimeoutError) {
    return !spendsTurn;
  }

  // Other errors (404, 400, 410, a bad status, a bad body) get the same answer again.
  return false;
}

function parseResponse<T>(status: HttpStatus, body: string, parse: (json: unknown) => T): T {
  if (status === HttpStatus.NOT_FOUND) {
    throw new GameNotFoundError();
  }

  // The game sends 400 only for a bad, expired or already solved adId.
  if (status === HttpStatus.BAD_REQUEST) {
    throw new AdNotFoundError();
  }

  if (status === HttpStatus.GONE) {
    throw new GameOverError();
  }

  if (status !== HttpStatus.OK) {
    throw new UpstreamUnavailableError(`The game API answered with status ${status}`);
  }

  let json: unknown;

  try {
    json = JSON.parse(body);
  } catch {
    throw new UpstreamUnavailableError('The game API sent a response that is not JSON');
  }

  return parse(json);
}

function unexpectedShape(): UpstreamUnavailableError {
  return new UpstreamUnavailableError('The game API sent a response with an unexpected shape');
}

// Makes an object of the class from the JSON. Throws when a field is missing or has a wrong type.
function toInstance<T extends object>(type: ClassConstructor<T>, json: unknown): T {
  const isObject = typeof json === 'object' && json !== null && !Array.isArray(json);

  if (!isObject) {
    throw unexpectedShape();
  }

  const instance = plainToInstance(type, json);
  // whitelist removes the fields that the class does not know.
  const errors = validateSync(instance, { whitelist: true });

  if (errors.length > 0) {
    throw unexpectedShape();
  }

  return instance;
}

function toInstances<T extends object>(type: ClassConstructor<T>, json: unknown): T[] {
  if (!Array.isArray(json)) {
    throw unexpectedShape();
  }

  return json.map((item) => toInstance(type, item));
}

// AbortSignal.timeout() makes fetch reject with an error named "TimeoutError".
function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}
