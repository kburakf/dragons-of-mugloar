import type { Ad } from '../api/types';

export type SortKey = 'recommended' | 'value' | 'reward' | 'expiry';

// Same limit as the bot uses. Below this rate, losing a life is likely.
export const SAFE_SUCCESS_RATE = 0.85;

export function isRisky(ad: Ad): boolean {
  return ad.isTrap || ad.successRate < SAFE_SUCCESS_RATE;
}

// Returns a new list. The original list does not change.
// "recommended": the ad of the advice first, traps last, the others by expected value.
export function sortAds(ads: Ad[], key: SortKey, recommendedAdId: string | null = null): Ad[] {
  const copy = [...ads];

  if (key === 'recommended') {
    const rank = (ad: Ad) => (ad.adId === recommendedAdId ? 0 : ad.isTrap ? 2 : 1);

    return copy.sort((a, b) => rank(a) - rank(b) || b.expectedValue - a.expectedValue);
  }

  if (key === 'value') return copy.sort((a, b) => b.expectedValue - a.expectedValue);
  if (key === 'reward') return copy.sort((a, b) => b.reward - a.reward);

  return copy.sort((a, b) => a.expiresIn - b.expiresIn);
}

export function rateClass(successRate: number): 'good' | 'medium' | 'bad' {
  if (successRate >= SAFE_SUCCESS_RATE) return 'good';
  if (successRate >= 0.5) return 'medium';

  return 'bad';
}

export function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
