import { Ad, Reputation } from '../mugloar/mugloar.schemas';

// The reputation change after a successful ad, by the type of the ad.
// Measured on the real API: a reputation check after each of about 300 solved ads.
// Each ad type gave the same change in every sample.
// A failed ad changes nothing. The change was the same at all tested levels (0 to 18).
// The first rule that matches the message wins, so the trap comes before the other steals.
const RULES: { pattern: RegExp; effect: Reputation }[] = [
  // The trap always fails, so it never changes the reputation.
  { pattern: /^Steal super awesome diamond/, effect: rep(0, 0, 0) },
  { pattern: /^Steal .* delivery to /, effect: rep(1, -2, 0) },
  { pattern: /^Infiltrate /, effect: rep(0, 2, -1) },
  { pattern: /^Investigate /, effect: rep(-0.1, 1, 0) },
  { pattern: /^Create an advertisement campaign/, effect: rep(1, 0, 0) },
  { pattern: / to write their biographical novel /, effect: rep(1, 0, 0) },
  { pattern: / to transport a magic /, effect: rep(0.3, 0, 0) },
  { pattern: / to reach an agreement /, effect: rep(0.2, 0, 0) },
  { pattern: /^Escort /, effect: rep(0.1, 0, 0) },
  { pattern: /^Rescue /, effect: rep(0.1, 0, 0) },
  { pattern: / to sell an unordinary /, effect: rep(0.1, 0, 0) },
  { pattern: / to fix their /, effect: rep(0.1, 0, 0) },
  { pattern: / to clean their /, effect: rep(0.1, 0, 0) },
  { pattern: /^Help defending /, effect: rep(0, 0, 0) },
];

function rep(people: number, state: number, underworld: number): Reputation {
  return { people, state, underworld };
}

// Returns null for an ad type that we did not measure.
export function reputationEffect(ad: Ad): Reputation | null {
  const rule = RULES.find(({ pattern }) => pattern.test(ad.message));

  return rule ? { ...rule.effect } : null;
}
