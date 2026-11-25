import { describe, expect, it } from 'vitest';
import {
  addReputation,
  direction,
  effectText,
  isZero,
  meterScale,
  meterWidth,
  signed,
  subtractReputation,
  trapWarning,
} from './reputation';

describe('signed', () => {
  it('adds a plus sign to a positive value and rounds to 0.1', () => {
    expect(signed(1.1)).toBe('+1.1');
    expect(signed(-2)).toBe('-2');
    expect(signed(0)).toBe('0');
    expect(signed(0.1 + 0.2)).toBe('+0.3');
  });
});

describe('addReputation and subtractReputation', () => {
  it('adds and subtracts each group', () => {
    const a = { people: 1.1, state: -2, underworld: 0 };
    const b = { people: 0.1, state: 2, underworld: -1 };

    expect(addReputation(a, b)).toEqual({ people: 1.2, state: 0, underworld: -1 });
    expect(subtractReputation(a, b)).toEqual({ people: 1, state: -4, underworld: 1 });
  });
});

describe('isZero and direction', () => {
  it('finds a reputation without change', () => {
    expect(isZero({ people: 0, state: 0, underworld: 0 })).toBe(true);
    expect(isZero({ people: 0.1, state: 0, underworld: 0 })).toBe(false);
  });

  it('gives the direction of a value', () => {
    expect(direction(0.3)).toBe('up');
    expect(direction(-1)).toBe('down');
    expect(direction(0.00001)).toBe('none');
  });
});

describe('meterWidth and meterScale', () => {
  it('fills at most one half of the meter', () => {
    expect(meterWidth(2.5, 5)).toBe(25);
    expect(meterWidth(-5, 5)).toBe(50);
    expect(meterWidth(12, 5)).toBe(50);
  });

  it('uses the largest value as the scale, with a minimum', () => {
    expect(meterScale({ people: 1, state: -2, underworld: 0 })).toBe(5);
    expect(meterScale({ people: 3, state: -14, underworld: 0 })).toBe(14);
  });
});

describe('effectText', () => {
  it('names only the groups that change', () => {
    expect(effectText({ people: 1, state: -2, underworld: 0 })).toBe('People +1, State -2');
    expect(effectText({ people: 0, state: 0, underworld: 0 })).toBe('No change');
  });
});

describe('trapWarning', () => {
  it('warns from State -8', () => {
    expect(trapWarning(-7)).toBe(false);
    expect(trapWarning(-8)).toBe(true);
    expect(trapWarning(-12)).toBe(true);
  });
});
