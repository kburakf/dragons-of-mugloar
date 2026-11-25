import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getAds, solveAd } from './client';

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed body', async () => {
    const body = { ads: [{ adId: 'a1' }], advice: { type: 'buy', itemId: 'hpot' } };

    mockFetch(Response.json(body));

    await expect(getAds('g1')).resolves.toEqual(body);
  });

  it('uses the right URL and method to solve an ad', async () => {
    const fetchMock = mockFetch(Response.json({ success: true }));

    await solveAd('g1', 'a1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3100/api/games/g1/ads/a1/solve',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws an ApiError with the message of the backend', async () => {
    mockFetch(
      Response.json(
        { statusCode: 404, error: 'AD_NOT_FOUND', message: 'Ad is gone' },
        { status: 404 },
      ),
    );

    await expect(getAds('g1')).rejects.toMatchObject({
      message: 'Ad is gone',
      statusCode: 404,
      code: 'AD_NOT_FOUND',
    });
  });

  it('uses a generic message when the error body is not JSON', async () => {
    mockFetch(new Response('oops', { status: 500 }));

    await expect(getAds('g1')).rejects.toThrow('The request failed (status 500).');
  });

  it('gives a friendly message when the network fails', async () => {
    mockFetch(new TypeError('Failed to fetch'));

    const error = await getAds('g1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'NETWORK_ERROR', statusCode: 0 });
  });
});
