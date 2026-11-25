import { setTimeout as sleep } from 'node:timers/promises';
import { MugloarClient } from '../mugloar/mugloar.client';
import { AdNotFoundError, GameOverError } from '../mugloar/mugloar.errors';
import { GameState } from '../mugloar/mugloar.schemas';
import { decideNextAction } from '../strategy/strategy';
import { applyBuy, applySolve, startTracking } from '../strategy/tracked-game';

// The game never ends while the bot keeps its lives. This cap stops a game after about 10 minutes.
export const DEFAULT_MAX_TURNS = 1_000;
// Pause after each action. The game API answers 429 at about 4.5 requests per second.
export const DEFAULT_PAUSE_MS = 300;
// An ad can expire between the ad list and the solve call. Allow a few of these in a row.
const MAX_AD_ERRORS_IN_ROW = 5;

export interface PlayOptions {
  maxTurns?: number;
  pauseMs?: number;
}

// One event for each action of the bot. The values are the state after the action.
export interface TurnEvent extends GameState {
  type: 'turn';
  gameId: string;
  action: 'solve' | 'buy';
  adId?: string;
  adMessage?: string;
  adProbability?: string;
  adReward?: number;
  itemId?: string;
  success: boolean;
}

export type StopReason = 'game-over' | 'max-turns';

export interface GameResult extends GameState {
  gameId: string;
  stopReason: StopReason;
  stealsDone: number;
}

// Plays one game until the lives run out or maxTurns is reached.
export async function playGame(
  client: MugloarClient,
  options: PlayOptions,
  onEvent: (event: TurnEvent) => void,
): Promise<GameResult> {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const pauseMs = options.pauseMs ?? DEFAULT_PAUSE_MS;

  const game = await client.startGame();
  const gameId = game.gameId;
  const tracked = startTracking(game);
  const state = tracked.state;
  let adErrorsInRow = 0;

  const finish = (stopReason: StopReason): GameResult => ({
    gameId,
    ...state,
    stopReason,
    stealsDone: tracked.stealsDone,
  });

  while (true) {
    if (state.lives <= 0) return finish('game-over');
    if (state.turn >= maxTurns) return finish('max-turns');

    try {
      // Getting the ads does not spend a turn, so we always decide on a fresh list.
      const ads = await client.getAds(gameId);
      const action = decideNextAction(state, ads, tracked.stealsDone);

      if (!action) {
        throw new Error('The game sent no ads');
      }

      if (action.type === 'buy') {
        const result = await client.buyItem(gameId, action.itemId);

        applyBuy(tracked, result);
        onEvent({
          type: 'turn',
          gameId,
          ...state,
          action: 'buy',
          itemId: action.itemId,
          success: result.shoppingSuccess,
        });
      } else {
        const ad = ads.find((candidate) => candidate.adId === action.adId);
        const result = await client.solveAd(gameId, action.adId);

        applySolve(tracked, result, ad);
        onEvent({
          type: 'turn',
          gameId,
          ...state,
          action: 'solve',
          adId: action.adId,
          adMessage: ad?.message,
          adProbability: ad?.probability,
          adReward: ad?.reward,
          success: result.success,
        });
      }

      adErrorsInRow = 0;
    } catch (error) {
      if (error instanceof GameOverError) {
        return finish('game-over');
      }

      if (error instanceof AdNotFoundError && adErrorsInRow < MAX_AD_ERRORS_IN_ROW) {
        adErrorsInRow++;
        await sleep(pauseMs);
        continue;
      }

      throw error;
    }

    await sleep(pauseMs);
  }
}
