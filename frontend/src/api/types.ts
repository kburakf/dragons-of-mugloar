// These types copy the backend responses. The backend has no shared package on purpose.

export interface GameStart {
  gameId: string;
  lives: number;
  gold: number;
  level: number;
  score: number;
  highScore: number;
  turn: number;
}

export interface Ad {
  adId: string;
  message: string;
  reward: number;
  // Number of turns until the ad goes away.
  expiresIn: number;
  // The difficulty label, for example "Walk in the park".
  probability: string;
  // From 0 to 1. The backend measured it for each label.
  successRate: number;
  expectedValue: number;
  isTrap: boolean;
  // The reputation change if the ad succeeds. Null for an ad type that the backend did not measure.
  reputationEffect: Reputation | null;
}

// The next action that the backend advises.
export type Advice = { type: 'solve'; adId: string } | { type: 'buy'; itemId: string };

export interface AdsResponse {
  ads: Ad[];
  // Null when the backend does not know the game.
  advice: Advice | null;
}

export interface SolveResult {
  success: boolean;
  lives: number;
  gold: number;
  score: number;
  highScore: number;
  turn: number;
  message: string;
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
}

export interface BuyResult {
  shoppingSuccess: boolean;
  gold: number;
  lives: number;
  level: number;
  turn: number;
}

export interface Reputation {
  people: number;
  state: number;
  underworld: number;
}

// The error body of the backend.
export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
}

export interface GameState {
  lives: number;
  gold: number;
  level: number;
  score: number;
  turn: number;
}
