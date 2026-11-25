import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { setUpApp } from '../app.setup';
import { loadConfig } from '../config';
import { MugloarClient } from '../mugloar/mugloar.client';
import {
  AdNotFoundError,
  GameNotFoundError,
  GameOverError,
  RateLimitedError,
  UpstreamTimeoutError,
  UpstreamUnavailableError,
} from '../mugloar/mugloar.errors';

const ads = [
  { adId: 'safe1', message: 'Help Anna', reward: 20, expiresIn: 7, probability: 'Sure thing' },
  { adId: 'risky1', message: 'Kill a dragon', reward: 200, expiresIn: 7, probability: 'Risky' },
  {
    adId: 'trap1',
    message: 'Steal super awesome diamond',
    reward: 99,
    expiresIn: 7,
    probability: 'Sure thing',
  },
];

describe('GamesController', () => {
  let app: INestApplication<App>;
  const client = {
    startGame: jest.fn(),
    getAds: jest.fn(),
    solveAd: jest.fn(),
    getShop: jest.fn(),
    buyItem: jest.fn(),
    investigateReputation: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MugloarClient)
      .useValue(client)
      .compile();

    app = moduleRef.createNestApplication();
    setUpApp(app, loadConfig({}));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('starts a game', async () => {
    const game = { gameId: 'g1', lives: 3, gold: 0, level: 0, score: 0, highScore: 0, turn: 0 };

    client.startGame.mockResolvedValue(game);

    const response = await request(app.getHttpServer()).post('/api/games').expect(201);

    expect(response.body).toEqual(game);
  });

  it('lists ads with advice to solve the strategy choice for a known game', async () => {
    // Level 100 at turn 0 is ahead, so the strategy solves instead of buying.
    client.startGame.mockResolvedValue({
      gameId: 'known1',
      lives: 3,
      gold: 0,
      level: 100,
      score: 0,
      highScore: 0,
      turn: 0,
    });
    client.getAds.mockResolvedValue(ads);
    await request(app.getHttpServer()).post('/api/games').expect(201);

    const response = await request(app.getHttpServer()).get('/api/games/known1/ads').expect(200);

    expect(response.body).toEqual({
      ads: [
        { ...ads[0], successRate: 1, expectedValue: 20, isTrap: false, reputationEffect: null },
        { ...ads[1], successRate: 0.43, expectedValue: 86, isTrap: false, reputationEffect: null },
        {
          ...ads[2],
          successRate: 1,
          expectedValue: 99,
          isTrap: true,
          reputationEffect: { people: 0, state: 0, underworld: 0 },
        },
      ],
      advice: { type: 'solve', adId: 'safe1' },
    });
  });

  it('advises a potion when lives are low and gold is enough', async () => {
    client.startGame.mockResolvedValue({
      gameId: 'low1',
      lives: 1,
      gold: 50,
      level: 100,
      score: 0,
      highScore: 0,
      turn: 0,
    });
    client.getAds.mockResolvedValue(ads);
    await request(app.getHttpServer()).post('/api/games').expect(201);

    const response = await request(app.getHttpServer()).get('/api/games/low1/ads').expect(200);

    expect(response.body.advice).toEqual({ type: 'buy', itemId: 'hpot' });
    expect(response.body.ads).toHaveLength(3);
  });

  it('advises a level item when the level is behind', async () => {
    client.startGame.mockResolvedValue({
      gameId: 'behind1',
      lives: 3,
      gold: 150,
      level: 0,
      score: 0,
      highScore: 0,
      turn: 0,
    });
    client.getAds.mockResolvedValue(ads);
    await request(app.getHttpServer()).post('/api/games').expect(201);

    const response = await request(app.getHttpServer()).get('/api/games/behind1/ads').expect(200);

    expect(response.body.advice).toEqual({ type: 'buy', itemId: 'cs' });
  });

  it('gives no advice for an unknown game', async () => {
    client.getAds.mockResolvedValue(ads);

    const response = await request(app.getHttpServer()).get('/api/games/unknown1/ads').expect(200);

    expect(response.body.advice).toBeNull();
    expect(response.body.ads).toHaveLength(3);
  });

  it('solves an ad', async () => {
    const result = {
      success: true,
      lives: 3,
      gold: 20,
      score: 20,
      highScore: 0,
      turn: 1,
      message: 'ok',
    };

    client.solveAd.mockResolvedValue(result);

    const response = await request(app.getHttpServer())
      .post('/api/games/g1/ads/safe1/solve')
      .expect(200);

    expect(response.body).toEqual(result);
    expect(client.solveAd).toHaveBeenCalledWith('g1', 'safe1');
  });

  it('buys an item', async () => {
    const result = { shoppingSuccess: true, gold: 0, lives: 4, level: 0, turn: 1 };

    client.buyItem.mockResolvedValue(result);

    const response = await request(app.getHttpServer())
      .post('/api/games/g1/shop/hpot/buy')
      .expect(200);

    expect(response.body).toEqual(result);
    expect(client.buyItem).toHaveBeenCalledWith('g1', 'hpot');
  });

  it.each([
    ['/api/games/bad!id/ads', 'get'],
    ['/api/games/g1/ads/bad%20id/solve', 'post'],
    [`/api/games/${'a'.repeat(41)}/shop`, 'get'],
  ] as const)('rejects the invalid id in %s with 400', async (path, method) => {
    const response = await request(app.getHttpServer())[method](path).expect(400);

    expect(response.body.error).toBe('INVALID_INPUT');
    expect(client.getAds).not.toHaveBeenCalled();
    expect(client.solveAd).not.toHaveBeenCalled();
    expect(client.getShop).not.toHaveBeenCalled();
  });

  it('gives a clear 400 message for an invalid game id', async () => {
    const response = await request(app.getHttpServer()).get('/api/games/bad!id/ads').expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      error: 'INVALID_INPUT',
      message: 'gameId: Must be 1-40 letters or digits',
    });
  });

  it.each([
    [new GameNotFoundError(), 404, 'GAME_NOT_FOUND'],
    [new AdNotFoundError(), 404, 'AD_NOT_FOUND'],
    [new GameOverError(), 410, 'GAME_OVER'],
    [new RateLimitedError(), 429, 'UPSTREAM_RATE_LIMITED'],
    [new UpstreamUnavailableError('down'), 502, 'UPSTREAM_UNAVAILABLE'],
    [new UpstreamTimeoutError(), 504, 'UPSTREAM_TIMEOUT'],
  ])('maps %p to HTTP %i', async (error, statusCode, code) => {
    client.solveAd.mockRejectedValue(error);

    const response = await request(app.getHttpServer())
      .post('/api/games/g1/ads/ad1/solve')
      .expect(statusCode);

    expect(response.body).toEqual({ statusCode, error: code, message: error.message });
  });

  it('serves the OpenAPI docs with every endpoint and its response schema', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    const paths = response.body.paths as Record<string, Record<string, unknown>>;

    expect(Object.keys(paths).sort()).toEqual([
      '/api/games',
      '/api/games/{gameId}/ads',
      '/api/games/{gameId}/ads/{adId}/solve',
      '/api/games/{gameId}/reputation',
      '/api/games/{gameId}/shop',
      '/api/games/{gameId}/shop/{itemId}/buy',
      '/api/health',
    ]);
    // The response points to a named schema, so we look up that schema.
    const responseSchema =
      response.body.paths['/api/games/{gameId}/ads'].get.responses['200'].content[
        'application/json'
      ].schema;

    expect(responseSchema.$ref).toBe('#/components/schemas/AdsResponse');
    const adsSchema = response.body.components.schemas.AdsResponse;

    expect(adsSchema.required).toEqual(['ads', 'advice']);
    // The advice is documented as one of the two actions, or null.
    expect(adsSchema.properties.advice.oneOf).toHaveLength(2);
    expect(adsSchema.properties.advice.nullable).toBe(true);
  });

  it('hides the details of an unexpected error', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    client.getShop.mockRejectedValue(new Error('secret internal detail'));

    const response = await request(app.getHttpServer()).get('/api/games/g1/shop').expect(500);

    expect(response.body).toEqual({
      statusCode: 500,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
});
