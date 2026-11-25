import type { ShopItem } from '../api/types';

// The bot also buys a potion at this many lives or fewer.
export const LOW_LIVES = 2;

export const SCORE_GOAL = 1000;

// The backend does not send the effect of an item, so we know it from the id and the price.
export function itemEffect(item: ShopItem): string {
  if (item.id === 'hpot') return '+1 life';
  if (item.cost >= 300) return '+2 levels';
  if (item.cost >= 100) return '+1 level';

  return 'Unknown effect';
}

export function isPotion(item: ShopItem): boolean {
  return item.id === 'hpot';
}
