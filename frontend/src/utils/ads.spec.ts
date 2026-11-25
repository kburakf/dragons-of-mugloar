import { describe, expect, it } from 'vitest';
import { rateClass } from './ads';

describe('rateClass', () => {
  it('groups the success rates by color', () => {
    expect(rateClass(0.95)).toBe('good');
    expect(rateClass(0.54)).toBe('medium');
    expect(rateClass(0.23)).toBe('bad');
  });
});
