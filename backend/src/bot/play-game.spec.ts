import { MugloarClient } from '../mugloar/mugloar.client';
import { AdNotFoundError, GameOverError } from '../mugloar/mugloar.errors';
import { Ad } from '../mugloar/mugloar.schemas';
import { playGame, TurnEvent } from './play-game';

const safeAd: Ad = {
  adId: 'ad1',
  message: 'Help Anna to fix their sheep',
  reward: 10,
  expiresIn: 7,
  probability: 'Sure thing',
};

const stealAd: Ad = { ...safeAd, adId: 'steal1', message: 'Steal a horse', reward: 50 };

// A fake game: every solve succeeds and gives 10 gold, the level stays high so the bot never buys.
function makeFakeClient(ads: Ad[] = [safeAd]) {
  let turn = 0;
  let score = 0;

  return {
    startGame: jest.fn().mockResolvedValue({
      gameId: 'game1',
      lives: 3,
      gold: 0,
      level: 10_000,
      score: 0,
      highScore: 0,
      turn: 0,
    }),
    getAds: jest.fn().mockResolvedValue(ads),
    solveAd: jest.fn().mockImplementation(() => {
      turn++;
      score += 10;

      return Promise.resolve({
        success: true,
        lives: 3,
        gold: score,
        score,
        highScore: 0,
        turn,
        message: 'ok',
      });
    }),
    buyItem: jest.fn(),
  };
}

function asClient(fake: ReturnType<typeof makeFakeClient>): MugloarClient {
  return fake as unknown as MugloarClient;
}

describe('playGame', () => {
  it('stops at maxTurns and sends one event per action', async () => {
    const fake = makeFakeClient();
    const events: TurnEvent[] = [];

    const result = await playGame(asClient(fake), { maxTurns: 3, pauseMs: 0 }, (event) =>
      events.push(event),
    );

    expect(result).toMatchObject({ gameId: 'game1', turn: 3, score: 30, stopReason: 'max-turns' });
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      type: 'turn',
      action: 'solve',
      adId: 'ad1',
      success: true,
      turn: 1,
      score: 10,
    });
  });

  it('stops when the lives reach 0', async () => {
    const fake = makeFakeClient();

    fake.solveAd.mockResolvedValue({
      success: false,
      lives: 0,
      gold: 0,
      score: 0,
      highScore: 0,
      turn: 1,
      message: 'failed',
    });

    const result = await playGame(asClient(fake), { pauseMs: 0 }, () => {});

    expect(result).toMatchObject({ lives: 0, stopReason: 'game-over' });
    expect(fake.solveAd).toHaveBeenCalledTimes(1);
  });

  it('stops cleanly when the game API answers 410 Game Over', async () => {
    const fake = makeFakeClient();

    fake.solveAd.mockRejectedValue(new GameOverError());

    const result = await playGame(asClient(fake), { pauseMs: 0 }, () => {});

    expect(result.stopReason).toBe('game-over');
  });

  it('gets a fresh ad list after an expired ad', async () => {
    const fake = makeFakeClient();

    fake.solveAd.mockRejectedValueOnce(new AdNotFoundError());

    const result = await playGame(asClient(fake), { maxTurns: 1, pauseMs: 0 }, () => {});

    expect(result.turn).toBe(1);
    expect(fake.getAds).toHaveBeenCalledTimes(2);
  });

  it('gives up after too many expired ads in a row', async () => {
    const fake = makeFakeClient();

    fake.solveAd.mockRejectedValue(new AdNotFoundError());

    await expect(playGame(asClient(fake), { pauseMs: 0 }, () => {})).rejects.toThrow(
      AdNotFoundError,
    );
  });

  it('counts successful steals and stops taking steals after 4', async () => {
    const fake = makeFakeClient([stealAd, safeAd]);

    const result = await playGame(asClient(fake), { maxTurns: 6, pauseMs: 0 }, () => {});

    expect(result.stealsDone).toBe(4);
    const solvedIds = fake.solveAd.mock.calls.map((call: string[]) => call[1]);

    expect(solvedIds).toEqual(['steal1', 'steal1', 'steal1', 'steal1', 'ad1', 'ad1']);
  });

  it('buys an item when the strategy says so', async () => {
    const fake = makeFakeClient();

    fake.startGame.mockResolvedValue({
      gameId: 'game1',
      lives: 2,
      gold: 100,
      level: 10_000,
      score: 0,
      highScore: 0,
      turn: 0,
    });
    fake.buyItem.mockResolvedValue({
      shoppingSuccess: true,
      gold: 50,
      lives: 3,
      level: 10_000,
      turn: 1,
    });
    const events: TurnEvent[] = [];

    await playGame(asClient(fake), { maxTurns: 1, pauseMs: 0 }, (event) => events.push(event));

    expect(fake.buyItem).toHaveBeenCalledWith('game1', 'hpot');
    expect(events[0]).toMatchObject({ action: 'buy', itemId: 'hpot', success: true, lives: 3 });
  });
});
