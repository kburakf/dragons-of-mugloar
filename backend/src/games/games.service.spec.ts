import { MugloarClient } from '../mugloar/mugloar.client';
import { GamesService } from './games.service';

const stealAd = {
  adId: 'steal1',
  message: 'Steal pigs delivery to Anna',
  reward: 100,
  expiresIn: 7,
  probability: 'Sure thing',
};
const safeAd = {
  adId: 'safe1',
  message: 'Help Anna',
  reward: 10,
  expiresIn: 7,
  probability: 'Sure thing',
};

function newGame(gameId: string, overrides: { gold?: number; level?: number } = {}) {
  return { gameId, lives: 3, gold: 0, level: 100, score: 0, highScore: 0, turn: 0, ...overrides };
}

describe('GamesService', () => {
  const client = {
    startGame: jest.fn(),
    getAds: jest.fn(),
    solveAd: jest.fn(),
    investigateReputation: jest.fn(),
  };
  let service: GamesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new GamesService(client as unknown as MugloarClient);
  });

  async function solve(gameId: string, adId: string, success: boolean, turn: number) {
    client.solveAd.mockResolvedValue({
      success,
      lives: 3,
      gold: 0,
      score: 0,
      highScore: 0,
      turn,
      message: '',
    });
    await service.solveAd(gameId, adId);
  }

  it('stops advising "Steal" ads after 4 successful steals, and a failed steal does not count', async () => {
    client.startGame.mockResolvedValue(newGame('g1'));
    client.getAds.mockResolvedValue([stealAd, safeAd]);
    await service.start();

    // 3 successes and 1 failure: 3 steals counted, so a steal is still advised.
    for (const [turn, success] of [
      [1, true],
      [2, true],
      [3, false],
      [4, true],
    ] as const) {
      expect((await service.getAds('g1')).advice).toEqual({ type: 'solve', adId: 'steal1' });
      await solve('g1', 'steal1', success, turn);
    }

    expect((await service.getAds('g1')).advice).toEqual({ type: 'solve', adId: 'steal1' });
    await solve('g1', 'steal1', true, 5);

    expect((await service.getAds('g1')).advice).toEqual({ type: 'solve', adId: 'safe1' });
  });

  it('counts a reputation check as one turn', async () => {
    // Level 14 at turn 0 is not behind (1.3 * 10 = 13). At turn 1 it is behind (1.3 * 11 = 14.3).
    client.startGame.mockResolvedValue(newGame('g1', { gold: 350, level: 14 }));
    client.getAds.mockResolvedValue([safeAd]);
    client.investigateReputation.mockResolvedValue({ people: 0, state: 0, underworld: 0 });
    await service.start();

    expect((await service.getAds('g1')).advice).toEqual({ type: 'solve', adId: 'safe1' });
    await service.investigateReputation('g1');

    expect((await service.getAds('g1')).advice).toEqual({ type: 'buy', itemId: 'iron' });
  });

  it('forgets the oldest game when 1000 games are known', async () => {
    for (let i = 0; i <= 1_000; i++) {
      client.startGame.mockResolvedValueOnce(newGame(`g${i}`));
      await service.start();
    }

    client.getAds.mockResolvedValue([safeAd]);

    expect((await service.getAds('g0')).advice).toBeNull();
    expect((await service.getAds('g1')).advice).toEqual({ type: 'solve', adId: 'safe1' });
  });
});
