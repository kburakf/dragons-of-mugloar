import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { Ad, Advice, AdsResponse, GameState, Reputation, ShopItem } from '../api/types';
import { itemEffect } from '../utils/game';
import { addReputation, NO_REPUTATION } from '../utils/reputation';

export interface Player extends GameState {
  highScore: number;
}

export interface LogEntry {
  id: number;
  text: string;
  // The result: good, bad, or only information.
  kind: 'good' | 'bad' | 'info';
  // The action that made the entry. The chronicle uses it for the color and the icon.
  action: 'solve' | 'buy' | 'investigate';
  // True when auto-play made the action, not a click.
  auto: boolean;
}

// Auto-play can make hundreds of actions. Keep enough history, but not without limit.
export const MAX_LOG_ENTRIES = 200;

export const useGameStore = defineStore('game', () => {
  const gameId = ref<string | null>(null);
  const player = ref<Player | null>(null);
  const ads = ref<Ad[]>([]);
  // The next action that the backend advises. Null when there is no advice.
  const advice = ref<Advice | null>(null);
  const shop = ref<ShopItem[]>([]);
  const log = ref<LogEntry[]>([]);
  // The result of the last check, and of the check before it. A game starts at 0 in each group.
  const reputation = ref<Reputation | null>(null);
  const previousReputation = ref<Reputation>(NO_REPUTATION);
  // The sum of the measured effects of the ads solved since the last check. The check costs
  // 1 turn, so this estimate shows the change for free.
  const expectedChange = ref<Reputation>(NO_REPUTATION);
  const solvedSinceCheck = ref(0);
  const gameOver = ref(false);
  // True while a request runs. The buttons use it to block a second request.
  const loading = ref(false);
  const error = ref<string | null>(null);

  let nextLogId = 1;

  function addLog(text: string, kind: LogEntry['kind'], action: LogEntry['action'], auto = false) {
    // The newest entry goes first.
    log.value = [{ id: nextLogId++, text, kind, action, auto }, ...log.value].slice(
      0,
      MAX_LOG_ENTRIES,
    );
  }

  function setAds(response: AdsResponse) {
    ads.value = response.ads;
    advice.value = response.advice;
  }

  // Every action goes through here: one request at a time, one place for errors.
  async function runAction(action: () => Promise<void>) {
    if (loading.value) return;
    loading.value = true;
    error.value = null;

    try {
      await action();
    } catch (e) {
      await handleError(e);
    } finally {
      loading.value = false;
    }
  }

  async function handleError(e: unknown) {
    if (!(e instanceof ApiError)) {
      console.error(e);
      error.value = 'Something went wrong. Try again.';

      return;
    }

    if (e.code === 'GAME_OVER') {
      gameOver.value = true;

      return;
    }

    error.value = e.message;

    // The game is gone on the server. Show the game over view, so the user can start a new game.
    if (e.code === 'GAME_NOT_FOUND') {
      gameOver.value = true;

      return;
    }

    // The ad expired before we sent the request. Load the list again so it is up to date.
    if (e.code === 'AD_NOT_FOUND' && gameId.value) {
      try {
        setAds(await api.getAds(gameId.value));
      } catch {
        // The first error message is enough.
      }
    }
  }

  // Lives at 0 end the game. The game server does not allow more requests after that.
  function checkGameOver() {
    if (player.value && player.value.lives <= 0) {
      gameOver.value = true;
    }
  }

  // Labels change with the level and a solved ad is gone, so we load the ads after each turn.
  async function loadAdsIfPlaying() {
    if (gameOver.value || !gameId.value) return;
    setAds(await api.getAds(gameId.value));
  }

  function start() {
    return runAction(async () => {
      const game = await api.startGame();

      gameId.value = game.gameId;
      player.value = {
        lives: game.lives,
        gold: game.gold,
        level: game.level,
        score: game.score,
        turn: game.turn,
        highScore: game.highScore,
      };
      gameOver.value = false;
      ads.value = [];
      advice.value = null;
      log.value = [];
      reputation.value = null;
      previousReputation.value = NO_REPUTATION;
      expectedChange.value = NO_REPUTATION;
      solvedSinceCheck.value = 0;
      const [adsResponse, newShop] = await Promise.all([
        api.getAds(game.gameId),
        api.getShop(game.gameId),
      ]);

      setAds(adsResponse);
      shop.value = newShop;
    });
  }

  function refreshAds() {
    return runAction(async () => {
      await loadAdsIfPlaying();
    });
  }

  // auto: true when auto-play runs the action. Only the chronicle uses it.
  function solve(adId: string, auto = false) {
    return runAction(async () => {
      if (!gameId.value || !player.value) return;
      const before = player.value;
      const ad = ads.value.find((candidate) => candidate.adId === adId);
      const result = await api.solveAd(gameId.value, adId);

      player.value = {
        ...before,
        lives: result.lives,
        gold: result.gold,
        score: result.score,
        turn: result.turn,
        highScore: result.highScore,
      };

      if (result.success) {
        const goldGain = result.gold - before.gold;
        const scoreGain = result.score - before.score;

        addLog(`Solved: +${goldGain} gold, +${scoreGain} points`, 'good', 'solve', auto);

        // A failed ad does not change the reputation, so only a success counts.
        if (ad?.reputationEffect) {
          expectedChange.value = addReputation(expectedChange.value, ad.reputationEffect);
          solvedSinceCheck.value++;
        }
      } else {
        const livesLost = before.lives - result.lives;
        const lifeText = livesLost === 1 ? '1 life' : `${livesLost} lives`;

        addLog(livesLost > 0 ? `Failed: -${lifeText}` : 'Failed', 'bad', 'solve', auto);
      }

      checkGameOver();
      await loadAdsIfPlaying();
    });
  }

  function buy(itemId: string, auto = false) {
    return runAction(async () => {
      if (!gameId.value || !player.value) return;
      const item = shop.value.find((candidate) => candidate.id === itemId);
      const name = item?.name ?? itemId;
      const result = await api.buyItem(gameId.value, itemId);

      player.value = {
        ...player.value,
        lives: result.lives,
        gold: result.gold,
        level: result.level,
        turn: result.turn,
      };

      if (result.shoppingSuccess) {
        const effect = item ? itemEffect(item) : '';

        addLog(`Bought ${name}: ${effect} (-${item?.cost ?? 0} gold)`, 'good', 'buy', auto);
      } else {
        addLog(`Could not buy ${name}`, 'bad', 'buy', auto);
      }

      checkGameOver();
      await loadAdsIfPlaying();
    });
  }

  function investigate() {
    return runAction(async () => {
      if (!gameId.value || !player.value) return;
      const result = await api.investigateReputation(gameId.value);

      previousReputation.value = reputation.value ?? NO_REPUTATION;
      reputation.value = result;
      expectedChange.value = NO_REPUTATION;
      solvedSinceCheck.value = 0;
      // The answer has no turn number, but the request spends one turn.
      player.value = { ...player.value, turn: player.value.turn + 1 };
      addLog(
        `Reputation: people ${result.people}, state ${result.state}, underworld ${result.underworld}`,
        'info',
        'investigate',
      );
      await loadAdsIfPlaying();
    });
  }

  return {
    gameId,
    player,
    ads,
    advice,
    shop,
    log,
    reputation,
    previousReputation,
    expectedChange,
    solvedSinceCheck,
    gameOver,
    loading,
    error,
    start,
    refreshAds,
    solve,
    buy,
    investigate,
  };
});
