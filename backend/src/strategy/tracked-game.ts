import { Ad, BuyResult, GameStart, GameState, SolveResult } from '../mugloar/mugloar.schemas';
import { isSteal } from './strategy';

// What the strategy needs to know about a game. We update it from each answer of the game API.
export interface TrackedGame {
  state: GameState;
  stealsDone: number;
}

export function startTracking(game: GameStart): TrackedGame {
  return {
    state: {
      lives: game.lives,
      gold: game.gold,
      level: game.level,
      score: game.score,
      turn: game.turn,
    },
    stealsDone: 0,
  };
}

// The ad is the ad that we solved. It is undefined when we do not know the ad.
export function applySolve(game: TrackedGame, result: SolveResult, ad: Ad | undefined): void {
  game.state.lives = result.lives;
  game.state.gold = result.gold;
  game.state.score = result.score;
  game.state.turn = result.turn;

  if (result.success && ad && isSteal(ad)) {
    game.stealsDone++;
  }
}

export function applyBuy(game: TrackedGame, result: BuyResult): void {
  game.state.lives = result.lives;
  game.state.gold = result.gold;
  game.state.level = result.level;
  game.state.turn = result.turn;
}
