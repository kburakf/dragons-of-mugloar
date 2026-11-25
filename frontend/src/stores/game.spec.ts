import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { Ad, AdsResponse } from '../api/types';
import { MAX_LOG_ENTRIES, useGameStore } from './game';

// Replace the network functions. Keep the real ApiError class.
vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  startGame: vi.fn(),
  getAds: vi.fn(),
  getShop: vi.fn(),
  solveAd: vi.fn(),
  buyItem: vi.fn(),
  investigateReputation: vi.fn(),
}));

const startResponse = {
  gameId: 'g1',
  lives: 3,
  gold: 0,
  level: 0,
  score: 0,
  highScore: 10,
  turn: 0,
};

function makeAd(adId: string): Ad {
  return {
    adId,
    message: 'Help a farmer',
    reward: 50,
    expiresIn: 5,
    probability: 'Sure thing',
    successRate: 1,
    expectedValue: 50,
    isTrap: false,
    reputationEffect: null,
  };
}

function adsResponse(adId: string, advice: AdsResponse['advice'] = null): AdsResponse {
  return { ads: [makeAd(adId)], advice };
}

async function startedStore() {
  const game = useGameStore();

  await game.start();

  return game;
}

describe('game store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.mocked(api.startGame).mockResolvedValue(startResponse);
    vi.mocked(api.getAds).mockResolvedValue(adsResponse('a1'));
    vi.mocked(api.getShop).mockResolvedValue([{ id: 'hpot', name: 'Healing potion', cost: 50 }]);
  });

  it('start loads the player, the ads and the shop', async () => {
    const game = await startedStore();

    expect(game.gameId).toBe('g1');
    expect(game.player?.lives).toBe(3);
    expect(game.ads).toHaveLength(1);
    expect(game.shop).toHaveLength(1);
    expect(game.error).toBeNull();
  });

  it('keeps the advice of the backend after start and after each action', async () => {
    vi.mocked(api.getAds).mockResolvedValue(adsResponse('a1', { type: 'solve', adId: 'a1' }));
    const game = await startedStore();

    expect(game.advice).toEqual({ type: 'solve', adId: 'a1' });

    vi.mocked(api.buyItem).mockResolvedValue({
      shoppingSuccess: true,
      gold: 0,
      lives: 3,
      level: 1,
      turn: 1,
    });
    vi.mocked(api.getAds).mockResolvedValue(adsResponse('a2', { type: 'buy', itemId: 'hpot' }));

    await game.buy('cs');

    expect(game.advice).toEqual({ type: 'buy', itemId: 'hpot' });
  });

  it('solve updates the player, writes the log and loads the ads again', async () => {
    const game = await startedStore();

    vi.mocked(api.solveAd).mockResolvedValue({
      success: true,
      lives: 3,
      gold: 120,
      score: 150,
      highScore: 150,
      turn: 1,
      message: 'ok',
    });
    vi.mocked(api.getAds).mockResolvedValue(adsResponse('a2'));

    await game.solve('a1');

    expect(game.player).toMatchObject({ gold: 120, score: 150, turn: 1 });
    expect(game.log[0]?.text).toBe('Solved: +120 gold, +150 points');
    expect(game.ads.map((ad) => ad.adId)).toEqual(['a2']);
  });

  it('a failed solve logs the lost life', async () => {
    const game = await startedStore();

    vi.mocked(api.solveAd).mockResolvedValue({
      success: false,
      lives: 2,
      gold: 0,
      score: 0,
      highScore: 10,
      turn: 1,
      message: 'no',
    });

    await game.solve('a1');

    expect(game.log[0]).toMatchObject({ text: 'Failed: -1 life', kind: 'bad', action: 'solve' });
    expect(game.gameOver).toBe(false);
  });

  it('the game ends at 0 lives and the ads are not loaded again', async () => {
    const game = await startedStore();

    vi.mocked(api.getAds).mockClear();
    vi.mocked(api.solveAd).mockResolvedValue({
      success: false,
      lives: 0,
      gold: 0,
      score: 40,
      highScore: 40,
      turn: 9,
      message: 'no',
    });

    await game.solve('a1');

    expect(game.gameOver).toBe(true);
    expect(api.getAds).not.toHaveBeenCalled();
  });

  it('an API error sets the error message and keeps the state', async () => {
    const game = await startedStore();

    vi.mocked(api.solveAd).mockRejectedValue(new ApiError('Server is down', 502, 'UPSTREAM'));

    await game.solve('a1');

    expect(game.error).toBe('Server is down');
    expect(game.player?.turn).toBe(0);
    expect(game.loading).toBe(false);
  });

  it('an expired ad sets the error and loads the ads again', async () => {
    const game = await startedStore();

    vi.mocked(api.solveAd).mockRejectedValue(new ApiError('Ad expired', 404, 'AD_NOT_FOUND'));
    vi.mocked(api.getAds).mockResolvedValue(adsResponse('a9'));

    await game.solve('a1');

    expect(game.error).toBe('Ad expired');
    expect(game.ads.map((ad) => ad.adId)).toEqual(['a9']);
  });

  it('an unknown game shows the error and the game over view', async () => {
    const game = await startedStore();

    vi.mocked(api.solveAd).mockRejectedValue(new ApiError('Game not found', 404, 'GAME_NOT_FOUND'));

    await game.solve('a1');

    expect(game.error).toBe('Game not found');
    expect(game.gameOver).toBe(true);
  });

  it('buy updates gold and level and writes the log', async () => {
    const game = await startedStore();

    vi.mocked(api.buyItem).mockResolvedValue({
      shoppingSuccess: true,
      gold: 0,
      lives: 4,
      level: 0,
      turn: 1,
    });

    await game.buy('hpot');

    expect(game.player).toMatchObject({ lives: 4, turn: 1 });
    expect(game.log[0]).toMatchObject({
      text: 'Bought Healing potion: +1 life (-50 gold)',
      kind: 'good',
      action: 'buy',
    });
  });

  it('ignores a second action while one request runs', async () => {
    const game = await startedStore();

    let finish: (value: Awaited<ReturnType<typeof api.solveAd>>) => void = () => {};

    vi.mocked(api.solveAd).mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const first = game.solve('a1');

    await game.solve('a1');
    expect(api.solveAd).toHaveBeenCalledTimes(1);

    finish({ success: true, lives: 3, gold: 1, score: 1, highScore: 1, turn: 1, message: '' });
    await first;
  });

  it('adds the reputation effect of each solved ad until the next check', async () => {
    const steal = { ...makeAd('s1'), reputationEffect: { people: 1, state: -2, underworld: 0 } };

    vi.mocked(api.getAds).mockResolvedValue({ ads: [steal], advice: null });
    const game = await startedStore();

    vi.mocked(api.solveAd).mockResolvedValueOnce({
      success: true,
      lives: 3,
      gold: 50,
      score: 50,
      highScore: 50,
      turn: 1,
      message: '',
    });
    vi.mocked(api.solveAd).mockResolvedValueOnce({
      success: false,
      lives: 2,
      gold: 50,
      score: 50,
      highScore: 50,
      turn: 2,
      message: '',
    });

    await game.solve('s1');
    await game.solve('s1');

    // Only the success counts. A failed ad does not change the reputation.
    expect(game.expectedChange).toEqual({ people: 1, state: -2, underworld: 0 });
    expect(game.solvedSinceCheck).toBe(1);

    vi.mocked(api.investigateReputation).mockResolvedValue({ people: 1, state: -2, underworld: 0 });
    await game.investigate();

    expect(game.reputation).toEqual({ people: 1, state: -2, underworld: 0 });
    expect(game.previousReputation).toEqual({ people: 0, state: 0, underworld: 0 });
    expect(game.expectedChange).toEqual({ people: 0, state: 0, underworld: 0 });
    expect(game.solvedSinceCheck).toBe(0);
  });

  it('keeps only the newest MAX_LOG_ENTRIES log entries', async () => {
    const game = await startedStore();

    vi.mocked(api.investigateReputation).mockResolvedValue({ people: 0, state: 0, underworld: 0 });

    for (let i = 0; i < MAX_LOG_ENTRIES + 5; i++) {
      await game.investigate();
    }

    expect(game.log).toHaveLength(MAX_LOG_ENTRIES);
  });
});
