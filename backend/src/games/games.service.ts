import { Injectable } from '@nestjs/common';
import { MugloarClient } from '../mugloar/mugloar.client';
import {
  Ad,
  BuyResult,
  GameStart,
  Reputation,
  ShopItem,
  SolveResult,
} from '../mugloar/mugloar.schemas';
import { Action, decideNextAction, expectedValue, isTrap, successRate } from '../strategy/strategy';
import { applyBuy, applySolve, startTracking, TrackedGame } from '../strategy/tracked-game';
import { AdsResponse } from './games.schemas';
import { reputationEffect } from './reputation-effect';

// What we know about a game that is played through our API.
interface KnownGame extends TrackedGame {
  lastAds: Ad[];
}

// Games kept in memory. When there are more, the oldest game is deleted.
const MAX_KNOWN_GAMES = 1_000;

// Manual play. The game API holds the real state; we keep the last known state only to
// advise an action. For a game we do not know (for example after a restart), we advise nothing.
@Injectable()
export class GamesService {
  private readonly games = new Map<string, KnownGame>();

  constructor(private readonly client: MugloarClient) {}

  async start(): Promise<GameStart> {
    const game = await this.client.startGame();

    if (this.games.size >= MAX_KNOWN_GAMES) {
      const oldestGameId = this.games.keys().next().value;

      if (oldestGameId !== undefined) this.games.delete(oldestGameId);
    }

    this.games.set(game.gameId, { ...startTracking(game), lastAds: [] });

    return game;
  }

  async getAds(gameId: string): Promise<AdsResponse> {
    const ads = await this.client.getAds(gameId);
    const known = this.games.get(gameId);
    let advice: Action | null = null;

    if (known) {
      known.lastAds = ads;
      advice = decideNextAction(known.state, ads, known.stealsDone);
    }

    return {
      ads: ads.map((ad) => ({
        ...ad,
        successRate: successRate(ad.probability),
        expectedValue: expectedValue(ad),
        isTrap: isTrap(ad),
        reputationEffect: reputationEffect(ad),
      })),
      advice,
    };
  }

  async solveAd(gameId: string, adId: string): Promise<SolveResult> {
    const result = await this.client.solveAd(gameId, adId);
    const known = this.games.get(gameId);

    if (known) {
      const ad = known.lastAds.find((candidate) => candidate.adId === adId);

      applySolve(known, result, ad);
    }

    return result;
  }

  getShop(gameId: string): Promise<ShopItem[]> {
    return this.client.getShop(gameId);
  }

  async buyItem(gameId: string, itemId: string): Promise<BuyResult> {
    const result = await this.client.buyItem(gameId, itemId);
    const known = this.games.get(gameId);

    if (known) {
      applyBuy(known, result);
    }

    return result;
  }

  async investigateReputation(gameId: string): Promise<Reputation> {
    const result = await this.client.investigateReputation(gameId);
    // The reputation answer has no turn number, but the request spends one turn.
    const known = this.games.get(gameId);

    if (known) {
      known.state.turn++;
    }

    return result;
  }
}
