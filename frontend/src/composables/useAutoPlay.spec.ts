import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { Ad, Advice, SolveResult } from '../api/types';
import { useGameStore } from '../stores/game';
import {
  STOPPED,
  STOPPED_ERROR,
  STOPPED_GAME_OVER,
  STOPPED_NO_ADVICE,
  useAutoPlay,
} from './useAutoPlay';

// Replace the network functions. Keep the real ApiError class.
vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  startGame: vi.fn(),
  getAds: vi.fn(),
  getShop: vi.fn(),
  solveAd: vi.fn(),
  buyItem: vi.fn(),
}));

// "normal" speed: 700 ms for each step. The move shows for 280 ms (40%), then it runs.
const SHOW_MS = 280;
const STEP_MS = 700;

const ad: Ad = {
  adId: 'a1',
  message: 'Help a farmer',
  reward: 50,
  expiresIn: 5,
  probability: 'Sure thing',
  successRate: 1,
  expectedValue: 50,
  isTrap: false,
  reputationEffect: null,
};

const SOLVE: Advice = { type: 'solve', adId: 'a1' };
const BUY: Advice = { type: 'buy', itemId: 'hpot' };

function solveResult(lives: number): SolveResult {
  return { success: true, lives, gold: 50, score: 50, highScore: 50, turn: 1, message: '' };
}

// Starts a game with the first advice, and makes auto-play in its own scope,
// like a component that mounts. scope.stop() is the unmount.
async function setup(firstAdvice: Advice | null = SOLVE) {
  vi.mocked(api.getAds).mockResolvedValueOnce({ ads: [ad], advice: firstAdvice });
  const game = useGameStore();

  await game.start();
  const scope = effectScope();
  const auto = scope.run(() => useAutoPlay())!;

  return { game, auto, scope };
}

describe('useAutoPlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.mocked(api.startGame).mockResolvedValue({
      gameId: 'g1',
      lives: 3,
      gold: 100,
      level: 0,
      score: 0,
      highScore: 0,
      turn: 0,
    });
    vi.mocked(api.getShop).mockResolvedValue([{ id: 'hpot', name: 'Healing potion', cost: 50 }]);
    vi.mocked(api.solveAd).mockResolvedValue(solveResult(3));
    vi.mocked(api.buyItem).mockResolvedValue({
      shoppingSuccess: true,
      gold: 50,
      lives: 4,
      level: 0,
      turn: 2,
    });
    // By default, the backend gives no advice after an action.
    vi.mocked(api.getAds).mockResolvedValue({ ads: [ad], advice: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the advised move first, then solves and buys like a click', async () => {
    const { game, auto } = await setup();

    vi.mocked(api.getAds).mockResolvedValueOnce({ ads: [ad], advice: BUY });

    auto.start();
    expect(auto.move.value).toEqual(SOLVE);
    expect(api.solveAd).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SHOW_MS);
    expect(api.solveAd).toHaveBeenCalledWith('g1', 'a1');
    expect(game.log[0]).toMatchObject({ action: 'solve', auto: true });

    await vi.advanceTimersByTimeAsync(STEP_MS);
    expect(api.buyItem).toHaveBeenCalledWith('g1', 'hpot');
    expect(game.log[0]).toMatchObject({ action: 'buy', auto: true });

    // The backend now gives no advice, so auto-play stops.
    await vi.advanceTimersByTimeAsync(STEP_MS);
    expect(auto.running.value).toBe(false);
    expect(auto.status.value).toBe(STOPPED_NO_ADVICE);
  });

  it('stops at game over', async () => {
    const { game, auto } = await setup();

    vi.mocked(api.solveAd).mockResolvedValue(solveResult(0));

    auto.start();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(game.gameOver).toBe(true);
    expect(api.solveAd).toHaveBeenCalledTimes(1);
    expect(auto.running.value).toBe(false);
    expect(auto.status.value).toBe(STOPPED_GAME_OVER);
  });

  it('stops when the user presses Stop', async () => {
    const { auto } = await setup();

    vi.mocked(api.getAds).mockResolvedValue({ ads: [ad], advice: SOLVE });

    auto.start();
    await vi.advanceTimersByTimeAsync(SHOW_MS);
    auto.stop();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(api.solveAd).toHaveBeenCalledTimes(1);
    expect(auto.running.value).toBe(false);
    expect(auto.move.value).toBeNull();
    expect(auto.status.value).toBe(STOPPED);
  });

  it('does not run the shown move when Stop comes first', async () => {
    const { auto } = await setup();

    auto.start();
    auto.stop();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(api.solveAd).not.toHaveBeenCalled();
  });

  it('stops on an error and keeps the error message of the store', async () => {
    const { game, auto } = await setup();

    vi.mocked(api.solveAd).mockRejectedValue(new ApiError('Server is down', 502, 'UPSTREAM'));

    auto.start();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(api.solveAd).toHaveBeenCalledTimes(1);
    expect(game.error).toBe('Server is down');
    expect(auto.running.value).toBe(false);
    expect(auto.status.value).toBe(STOPPED_ERROR);
  });

  it('does not start without advice', async () => {
    const { auto } = await setup(null);

    auto.start();

    expect(auto.running.value).toBe(false);
    expect(auto.status.value).toBe(STOPPED_NO_ADVICE);
  });

  it('never runs two actions at the same time', async () => {
    const { auto } = await setup();

    vi.mocked(api.getAds).mockResolvedValue({ ads: [ad], advice: SOLVE });

    let finish: (result: SolveResult) => void = () => {};

    vi.mocked(api.solveAd).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    auto.start();
    // The first request does not end, so no second request starts.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(api.solveAd).toHaveBeenCalledTimes(1);

    // The request ends. The next step starts only after the wait.
    finish(solveResult(3));
    await vi.advanceTimersByTimeAsync(0);
    expect(api.solveAd).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(STEP_MS);
    expect(api.solveAd).toHaveBeenCalledTimes(2);
    auto.stop();
  });

  it('clears its timer when the component unmounts', async () => {
    const { auto, scope } = await setup();

    auto.start();
    scope.stop();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(api.solveAd).not.toHaveBeenCalled();
    expect(auto.running.value).toBe(false);
  });
});
