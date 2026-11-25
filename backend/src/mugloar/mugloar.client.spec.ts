import { Logger } from '@nestjs/common';
import { MugloarClient } from './mugloar.client';
import {
  AdNotFoundError,
  GameNotFoundError,
  GameOverError,
  RateLimitedError,
  UpstreamTimeoutError,
  UpstreamUnavailableError,
} from './mugloar.errors';

const BASE_URL = 'https://game.test/api/v2';

const solveBody = {
  success: true,
  lives: 3,
  gold: 78,
  score: 78,
  highScore: 0,
  turn: 3,
  message: 'You successfully solved the mission!',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function htmlResponse(status: number): Response {
  return new Response('<!DOCTYPE html><pre>Error</pre>', { status });
}

function timeoutError(): Error {
  const error = new Error('The operation was aborted due to timeout');

  error.name = 'TimeoutError';

  return error;
}

describe('MugloarClient', () => {
  let fetchMock: jest.SpyInstance;
  // retryDelayMs = 1 keeps the retry tests fast.
  const client = new MugloarClient({ baseUrl: BASE_URL, retryDelayMs: 1, maxAttempts: 3 });

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts a game with POST /game/start', async () => {
    const game = { gameId: 'abc', lives: 3, gold: 0, level: 0, score: 0, highScore: 0, turn: 0 };

    fetchMock.mockResolvedValue(jsonResponse(game));

    await expect(client.startGame()).resolves.toEqual(game);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/game/start`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('decodes encrypted ads', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          adId: Buffer.from('ad1').toString('base64'),
          message: Buffer.from('Help Anna').toString('base64'),
          reward: 10,
          expiresIn: 7,
          encrypted: 1,
          probability: Buffer.from('Sure thing').toString('base64'),
        },
      ]),
    );

    await expect(client.getAds('abc')).resolves.toEqual([
      { adId: 'ad1', message: 'Help Anna', reward: 10, expiresIn: 7, probability: 'Sure thing' },
    ]);
  });

  it('throws UpstreamUnavailableError when the response has an unexpected shape', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: 'yes' }));
    await expect(client.solveAd('abc', 'ad1')).rejects.toThrow(UpstreamUnavailableError);
  });

  it('does not retry a response with an unexpected shape', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ wrong: true }]));
    await expect(client.getShop('abc')).rejects.toThrow(UpstreamUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws UpstreamUnavailableError when the response is not JSON', async () => {
    fetchMock.mockResolvedValue(htmlResponse(200));
    await expect(client.getShop('abc')).rejects.toThrow(UpstreamUnavailableError);
  });

  it.each([
    [404, GameNotFoundError],
    [400, AdNotFoundError],
    [410, GameOverError],
  ])('maps status %i to %p without a retry', async (status, errorType) => {
    fetchMock.mockResolvedValue(htmlResponse(status));
    await expect(client.solveAd('abc', 'ad1')).rejects.toThrow(errorType);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 429 and returns the next good answer', async () => {
    fetchMock
      .mockResolvedValueOnce(htmlResponse(429))
      .mockResolvedValueOnce(jsonResponse(solveBody));

    await expect(client.solveAd('abc', 'ad1')).resolves.toEqual(solveBody);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a 5xx and returns the next good answer', async () => {
    fetchMock
      .mockResolvedValueOnce(htmlResponse(503))
      .mockResolvedValueOnce(jsonResponse(solveBody));

    await expect(client.solveAd('abc', 'ad1')).resolves.toEqual(solveBody);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws RateLimitedError when all attempts get 429', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(htmlResponse(429)));
    await expect(client.getShop('abc')).rejects.toThrow(RateLimitedError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws UpstreamUnavailableError when all attempts get 5xx', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(htmlResponse(502)));
    await expect(client.getShop('abc')).rejects.toThrow(UpstreamUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws UpstreamUnavailableError when a solve gets 5xx on every attempt', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(htmlResponse(503)));
    await expect(client.solveAd('abc', 'ad1')).rejects.toThrow(UpstreamUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a GET after a network error', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(client.getAds('abc')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a solve after a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(client.solveAd('abc', 'ad1')).rejects.toThrow(UpstreamUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a buy after a timeout', async () => {
    fetchMock.mockRejectedValue(timeoutError());
    await expect(client.buyItem('abc', 'hpot')).rejects.toThrow(UpstreamTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws UpstreamTimeoutError when every GET attempt times out', async () => {
    fetchMock.mockRejectedValue(timeoutError());
    await expect(client.getAds('abc')).rejects.toThrow(UpstreamTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('encodes ids in the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(solveBody));
    await client.solveAd('a/b', 'c d');
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/a%2Fb/solve/c%20d`, expect.anything());
  });
});
