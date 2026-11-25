// Plays a few real turns through our API against the real game API.
// It sends about 6 requests to the game, so run it by hand, not in a loop.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setUpApp } from '../src/app.setup';
import { loadConfig } from '../src/config';

interface AdView {
  adId: string;
  successRate: number;
}

interface AdsResponse {
  ads: AdView[];
  advice: { type: 'solve'; adId: string } | { type: 'buy'; itemId: string } | null;
}

describe('Game API (real upstream)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    setUpApp(app, loadConfig());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts a game, solves an ad and buys a potion', async () => {
    const server = app.getHttpServer();

    const game = await request(server).post('/api/games').expect(201);

    expect(game.body).toMatchObject({ lives: 3, gold: 0, turn: 0 });
    const gameId = game.body.gameId as string;

    const adsResponse = await request(server).get(`/api/games/${gameId}/ads`).expect(200);
    const { ads, advice } = adsResponse.body as AdsResponse;

    expect(ads.length).toBeGreaterThan(0);
    expect(ads[0]).toEqual(
      expect.objectContaining({ adId: expect.any(String), successRate: expect.any(Number) }),
    );

    // At turn 0 with 0 gold the strategy can only solve, so the advice is to solve one ad.
    expect(advice).toEqual({ type: 'solve', adId: expect.any(String) });

    const solved = await request(server)
      .post(`/api/games/${gameId}/ads/${(advice as { adId: string }).adId}/solve`)
      .expect(200);

    expect(solved.body).toMatchObject({ success: expect.any(Boolean), turn: 1 });

    const shop = await request(server).get(`/api/games/${gameId}/shop`).expect(200);

    expect(shop.body).toContainEqual(expect.objectContaining({ id: 'hpot', cost: 50 }));

    // With less than 50 gold the game answers shoppingSuccess: false. Both answers are valid here.
    const bought = await request(server).post(`/api/games/${gameId}/shop/hpot/buy`).expect(200);

    expect(bought.body).toMatchObject({ shoppingSuccess: expect.any(Boolean), turn: 2 });
  });

  it('maps an unknown game to 404', async () => {
    const response = await request(app.getHttpServer()).get('/api/games/nogame123/ads').expect(404);

    expect(response.body.error).toBe('GAME_NOT_FOUND');
  });
});
