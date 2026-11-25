import { Ad, GameState } from '../mugloar/mugloar.schemas';

// Success rate per difficulty label, measured from about 4,400 solved ads on the real API.
// The rate of a label is the same at every level.
export const SUCCESS_RATES: Record<string, number> = {
  'Sure thing': 1.0,
  'Piece of cake': 0.95,
  'Walk in the park': 0.85,
  'Quite likely': 0.79,
  'Hmmm....': 0.68,
  Gamble: 0.54,
  Risky: 0.43,
  'Rather detrimental': 0.3,
  'Playing with fire': 0.23,
  'Suicide mission': 0.06,
  Impossible: 0.0,
};

// Only "Walk in the park" (0.85) and easier labels are safe. One lost life costs more than one reward.
export const SAFE_SUCCESS_RATE = 0.85;
// Buy a healing potion at this many lives or fewer. Potions are cheap and lives have no cap.
export const POTION_LIVES = 2;
// Keep the level above 1.3 * (turn + 10). At 1.3 all ads stayed easy up to turn 900; at 0.96 the game ended at turn 278.
export const LEVEL_PER_TURN = 1.3;
export const LEVEL_TURN_OFFSET = 10;
// "Steal super awesome diamond" ads failed 22 times out of 22, whatever their label.
export const TRAP_PREFIX = 'Steal super awesome diamond';
// After this many successful "Steal" ads, traps filled the ad list (observation, not proof).
export const MAX_STEALS = 4;

// Shop prices are fixed. Each item of a tier gives the same level, but each item trains another skill.
// With only one item per tier, ads got hard at turn 55 and 22 of 22 games ended before turn 100.
// With all items in turn, 14 of 20 games reached turn 200 (benchmark in the README).
export const POTION = { itemId: 'hpot', cost: 50 };
export const SMALL_LEVEL_ITEMS = { itemIds: ['cs', 'gas', 'wax', 'tricks', 'wingpot'], cost: 100 }; // +1 level
export const BIG_LEVEL_ITEMS = { itemIds: ['ch', 'rf', 'iron', 'mtrix', 'wingpotmax'], cost: 300 }; // +2 levels
// Buy +1 items only below this level. Above it, one reward (about 200 gold) pays most of a +2 item.
// Games that bought +1 items at every level reached only 0.6 levels per turn.
export const SMALL_ITEM_MAX_LEVEL = 10;
// Gold to keep after a level item, so that a potion is still possible.
export const GOLD_RESERVE = POTION.cost;

export type Action = { type: 'buy'; itemId: string } | { type: 'solve'; adId: string };

// Unknown labels get 0, so the strategy never picks an ad it cannot rate.
export function successRate(probability: string): number {
  return SUCCESS_RATES[probability] ?? 0;
}

export function isTrap(ad: Ad): boolean {
  return ad.message.startsWith(TRAP_PREFIX);
}

export function isSteal(ad: Ad): boolean {
  return ad.message.startsWith('Steal');
}

export function expectedValue(ad: Ad): number {
  return ad.reward * successRate(ad.probability);
}

// Picks the next action for the bot. Returns null only when there is nothing to do (no ads).
export function decideNextAction(state: GameState, ads: Ad[], stealsDone: number): Action | null {
  // 1. Low on lives: heal first.
  if (state.lives <= POTION_LIVES && state.gold >= POTION.cost) {
    return { type: 'buy', itemId: POTION.itemId };
  }

  // 2. Allowed ads: no traps and no more steals after the cap. Safe ads also have a high rate.
  const allowedAds = ads.filter((ad) => !isTrap(ad) && !(isSteal(ad) && stealsDone >= MAX_STEALS));
  const safeAds = allowedAds.filter((ad) => successRate(ad.probability) >= SAFE_SUCCESS_RATE);

  // 3. Level is behind the turn count, or no safe ad: buy levels.
  const levelIsBehind = state.level < LEVEL_PER_TURN * (state.turn + LEVEL_TURN_OFFSET);

  if (state.lives > POTION_LIVES && (levelIsBehind || safeAds.length === 0)) {
    if (state.gold >= BIG_LEVEL_ITEMS.cost + GOLD_RESERVE) {
      return { type: 'buy', itemId: nextItem(BIG_LEVEL_ITEMS.itemIds, state.level, 2) };
    }

    if (state.level < SMALL_ITEM_MAX_LEVEL && state.gold >= SMALL_LEVEL_ITEMS.cost + GOLD_RESERVE) {
      return { type: 'buy', itemId: nextItem(SMALL_LEVEL_ITEMS.itemIds, state.level, 1) };
    }
  }

  // 4. Solve the best safe ad. With no safe ad, solve the best allowed ad, or any ad as a last choice.
  const candidates = [safeAds, allowedAds, ads].find((list) => list.length > 0) ?? [];
  // A lost life costs a potion and a turn. A turn is worth about one average reward.
  const failureCost = POTION.cost + averageReward(allowedAds.length > 0 ? allowedAds : ads);
  const score = (ad: Ad): number =>
    state.lives <= POTION_LIVES
      ? successRate(ad.probability) // Low on lives: only the chance counts.
      : expectedValue(ad) - (1 - successRate(ad.probability)) * failureCost;
  const bestAd = pickBest(candidates, (a, b) => score(a) - score(b) || a.reward - b.reward);

  return bestAd ? { type: 'solve', adId: bestAd.adId } : null;
}

// The level grows by the item size after each purchase, so this cycles through all items of the tier.
function nextItem(itemIds: string[], level: number, levelsPerItem: number): string {
  return itemIds[Math.floor(level / levelsPerItem) % itemIds.length]!;
}

function averageReward(ads: Ad[]): number {
  return ads.length > 0 ? ads.reduce((sum, ad) => sum + ad.reward, 0) / ads.length : 0;
}

// Returns the best ad. compare(a, b) > 0 means that a is better than b. On a tie, the first ad wins.
function pickBest(ads: Ad[], compare: (a: Ad, b: Ad) => number): Ad | undefined {
  let best: Ad | undefined;

  for (const ad of ads) {
    if (!best || compare(ad, best) > 0) {
      best = ad;
    }
  }

  return best;
}
