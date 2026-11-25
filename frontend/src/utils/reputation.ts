import type { Reputation } from '../api/types';

export type ReputationKey = keyof Reputation;

// The 3 groups in the order the game sends them.
export const REPUTATION_GROUPS: { key: ReputationKey; label: string }[] = [
  { key: 'people', label: 'People' },
  { key: 'state', label: 'State' },
  { key: 'underworld', label: 'Underworld' },
];

export const NO_REPUTATION: Reputation = { people: 0, state: 0, underworld: 0 };

// The game uses steps of 0.1. Rounding removes float noise like 0.30000000000000004.
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

// "+1.1", "-2" or "0".
export function signed(value: number): string {
  const rounded = round(value);

  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function addReputation(a: Reputation, b: Reputation): Reputation {
  return {
    people: round(a.people + b.people),
    state: round(a.state + b.state),
    underworld: round(a.underworld + b.underworld),
  };
}

export function subtractReputation(a: Reputation, b: Reputation): Reputation {
  return addReputation(a, { people: -b.people, state: -b.state, underworld: -b.underworld });
}

export function isZero(reputation: Reputation): boolean {
  return REPUTATION_GROUPS.every(({ key }) => round(reputation[key]) === 0);
}

export function direction(value: number): 'up' | 'down' | 'none' {
  const rounded = round(value);

  if (rounded > 0) return 'up';
  if (rounded < 0) return 'down';

  return 'none';
}

// Width of the meter bar in percent of the full meter. The bar starts at the middle,
// so the maximum is 50. A value of `scale` or more fills one half.
export function meterWidth(value: number, scale: number): number {
  return (Math.min(Math.abs(value), scale) / scale) * 50;
}

// The scale grows with the largest value, so a large value does not fill the meter at once.
export const MIN_METER_SCALE = 5;

export function meterScale(reputation: Reputation): number {
  return Math.max(
    MIN_METER_SCALE,
    ...REPUTATION_GROUPS.map(({ key }) => Math.abs(reputation[key])),
  );
}

// "People +1, State -2". Only the groups that change.
export function effectText(effect: Reputation): string {
  if (isZero(effect)) return 'No change';

  return REPUTATION_GROUPS.filter(({ key }) => round(effect[key]) !== 0)
    .map(({ key, label }) => `${label} ${signed(effect[key])}`)
    .join(', ');
}

// New traps ("Steal super awesome diamond") came only at State -10 or lower, and stopped
// when State went up again. This is a pattern from our probes, not a proven rule.
// The warning starts 1 step earlier, at -8: one more Steal delivery (State -2) gives -10.
export const TRAP_WARNING_STATE = -8;

export function trapWarning(state: number): boolean {
  return state <= TRAP_WARNING_STATE;
}
