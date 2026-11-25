import { Ad, GameState } from '../mugloar/mugloar.schemas';
import { decideNextAction, expectedValue, isSteal, isTrap, successRate } from './strategy';

function makeAd(overrides: Partial<Ad> = {}): Ad {
  return {
    adId: 'ad1',
    message: 'Help Anna to fix their sheep',
    reward: 10,
    expiresIn: 7,
    probability: 'Sure thing',
    ...overrides,
  };
}

// A state where no rule about lives or level applies: the level is far ahead of the turn.
function makeState(overrides: Partial<GameState> = {}): GameState {
  return { lives: 3, gold: 0, level: 100, score: 0, turn: 10, ...overrides };
}

describe('successRate', () => {
  it('returns the measured rate for a known label', () => {
    expect(successRate('Sure thing')).toBe(1);
    expect(successRate('Walk in the park')).toBe(0.85);
    expect(successRate('Impossible')).toBe(0);
  });

  it('returns 0 for an unknown label', () => {
    expect(successRate('Totally new label')).toBe(0);
  });
});

describe('isTrap and isSteal', () => {
  it('finds the diamond trap', () => {
    const trap = makeAd({ message: 'Steal super awesome diamond from the king' });

    expect(isTrap(trap)).toBe(true);
    expect(isSteal(trap)).toBe(true);
  });

  it('does not mark a normal steal as a trap', () => {
    const steal = makeAd({ message: 'Steal pot delivery to Tom and share the profits' });

    expect(isTrap(steal)).toBe(false);
    expect(isSteal(steal)).toBe(true);
  });
});

describe('expectedValue', () => {
  it('multiplies the reward by the success rate', () => {
    expect(expectedValue(makeAd({ reward: 100, probability: 'Piece of cake' }))).toBe(95);
  });
});

describe('decideNextAction', () => {
  describe('rule 1: potion', () => {
    it('buys a potion at 2 lives when gold is enough', () => {
      const action = decideNextAction(makeState({ lives: 2, gold: 50 }), [makeAd()], 0);

      expect(action).toEqual({ type: 'buy', itemId: 'hpot' });
    });

    it('does not buy a potion with less than 50 gold', () => {
      const action = decideNextAction(makeState({ lives: 1, gold: 49 }), [makeAd()], 0);

      expect(action).toEqual({ type: 'solve', adId: 'ad1' });
    });

    it('does not buy a potion at 3 lives', () => {
      const action = decideNextAction(makeState({ lives: 3, gold: 50 }), [makeAd()], 0);

      expect(action).toEqual({ type: 'solve', adId: 'ad1' });
    });
  });

  describe('rule 3: level items', () => {
    // Level 0 at turn 0 is behind 1.3 * (0 + 10) = 13.
    const behind = { level: 0, turn: 0 };

    it('buys a +2 item when the level is behind and gold is at least 350', () => {
      const action = decideNextAction(makeState({ ...behind, gold: 350 }), [makeAd()], 0);

      expect(action).toEqual({ type: 'buy', itemId: 'ch' });
    });

    it('buys a +1 item below level 10 when gold is between 150 and 349', () => {
      const action = decideNextAction(makeState({ ...behind, gold: 349 }), [makeAd()], 0);

      expect(action).toEqual({ type: 'buy', itemId: 'cs' });
    });

    it('does not buy a +1 item at level 10 or more', () => {
      const state = makeState({ level: 10, turn: 0, gold: 349 });

      expect(decideNextAction(state, [makeAd()], 0)).toEqual({ type: 'solve', adId: 'ad1' });
    });

    it('solves an ad when gold is below 150', () => {
      const action = decideNextAction(makeState({ ...behind, gold: 149 }), [makeAd()], 0);

      expect(action).toEqual({ type: 'solve', adId: 'ad1' });
    });

    it('cycles through the items of a tier as the level grows', () => {
      const small = [0, 1, 2, 3, 4, 5].map((level) =>
        decideNextAction(makeState({ level, turn: 0, gold: 150 }), [], 0),
      );

      expect(small.map((action) => action?.type === 'buy' && action.itemId)).toEqual([
        'cs',
        'gas',
        'wax',
        'tricks',
        'wingpot',
        'cs',
      ]);
      const big = [10, 12, 14, 16, 18, 20].map((level) =>
        decideNextAction(makeState({ level, turn: 10, gold: 350 }), [], 0),
      );

      expect(big.map((action) => action?.type === 'buy' && action.itemId)).toEqual([
        'ch',
        'rf',
        'iron',
        'mtrix',
        'wingpotmax',
        'ch',
      ]);
    });

    it('does not buy levels when the level is ahead and a safe ad exists', () => {
      // 1.3 * (10 + 10) = 26, so level 26 is not behind.
      const state = makeState({ level: 26, turn: 10, gold: 1000 });

      expect(decideNextAction(state, [makeAd()], 0)).toEqual({ type: 'solve', adId: 'ad1' });
    });

    it('buys levels when no safe ad exists, even with the level ahead', () => {
      const state = makeState({ gold: 1000 });
      const ads = [makeAd({ probability: 'Gamble' })];

      expect(decideNextAction(state, ads, 0)).toEqual({ type: 'buy', itemId: 'ch' });
    });

    it('does not buy levels at 2 lives or fewer', () => {
      // 2 lives and 40 gold: no potion (too little gold) and no level item.
      const state = makeState({ ...behind, lives: 2, gold: 40 });

      expect(decideNextAction(state, [makeAd()], 0)).toEqual({ type: 'solve', adId: 'ad1' });
    });
  });

  describe('rule 4: best safe ad', () => {
    // Failure cost = 50 + average reward. Score = reward * rate - (1 - rate) * failure cost.
    it('takes the failure cost into account', () => {
      const ads = [
        makeAd({ adId: 'sure', reward: 100, probability: 'Sure thing' }), // 100
        makeAd({ adId: 'walk', reward: 110, probability: 'Walk in the park' }), // 93.5 - 0.15 * 155 = 70.25
      ];

      expect(decideNextAction(makeState(), ads, 0)).toEqual({ type: 'solve', adId: 'sure' });
    });

    it('takes a riskier safe ad when its reward is much higher', () => {
      const ads = [
        makeAd({ adId: 'sure', reward: 100, probability: 'Sure thing' }), // 100
        makeAd({ adId: 'walk', reward: 200, probability: 'Walk in the park' }), // 170 - 0.15 * 200 = 140
      ];

      expect(decideNextAction(makeState(), ads, 0)).toEqual({ type: 'solve', adId: 'walk' });
    });

    it('ignores ads that are not safe while a safe ad exists', () => {
      const ads = [
        makeAd({ adId: 'safe', reward: 50, probability: 'Walk in the park' }),
        makeAd({ adId: 'risky', reward: 500, probability: 'Quite likely' }),
      ];

      expect(decideNextAction(makeState(), ads, 0)).toEqual({ type: 'solve', adId: 'safe' });
    });

    it('takes the safest ad at 2 lives or fewer', () => {
      const ads = [
        makeAd({ adId: 'walk', reward: 900, probability: 'Walk in the park' }),
        makeAd({ adId: 'sure', reward: 10, probability: 'Sure thing' }),
      ];
      const state = makeState({ lives: 2, gold: 0 });

      expect(decideNextAction(state, ads, 0)).toEqual({ type: 'solve', adId: 'sure' });
    });

    it('skips traps even with a high label', () => {
      const ads = [
        makeAd({ adId: 'trap', message: 'Steal super awesome diamond', reward: 999 }),
        makeAd({ adId: 'normal', reward: 5 }),
      ];

      expect(decideNextAction(makeState(), ads, 0)).toEqual({ type: 'solve', adId: 'normal' });
    });

    it('allows steals before the cap of 4', () => {
      const ads = [
        makeAd({ adId: 'steal', message: 'Steal a horse', reward: 100 }),
        makeAd({ adId: 'normal', reward: 5 }),
      ];

      expect(decideNextAction(makeState(), ads, 3)).toEqual({ type: 'solve', adId: 'steal' });
    });

    it('skips steals after 4 successful steals', () => {
      const ads = [
        makeAd({ adId: 'steal', message: 'Steal a horse', reward: 100 }),
        makeAd({ adId: 'normal', reward: 5 }),
      ];

      expect(decideNextAction(makeState(), ads, 4)).toEqual({ type: 'solve', adId: 'normal' });
    });
  });

  describe('rule 4: fallback without a safe ad', () => {
    it('picks the ad with the best score, failure cost included', () => {
      // Failure cost = 50 + 140 = 190. Gamble: 108 - 0.46 * 190 = 20.6. Quite likely: 63.2 - 0.21 * 190 = 23.3.
      const ads = [
        makeAd({ adId: 'gamble', reward: 200, probability: 'Gamble' }),
        makeAd({ adId: 'likely', reward: 80, probability: 'Quite likely' }),
      ];

      expect(decideNextAction(makeState(), ads, 0)).toEqual({ type: 'solve', adId: 'likely' });
    });

    it('picks the ad with the highest success rate at 2 lives or fewer', () => {
      const ads = [
        makeAd({ adId: 'gamble', reward: 500, probability: 'Gamble' }),
        makeAd({ adId: 'likely', reward: 10, probability: 'Quite likely' }),
      ];
      const state = makeState({ lives: 1, gold: 0 });

      expect(decideNextAction(state, ads, 0)).toEqual({ type: 'solve', adId: 'likely' });
    });

    it('picks the higher reward on a tie', () => {
      const ads = [
        makeAd({ adId: 'low', reward: 10, probability: 'Risky' }),
        makeAd({ adId: 'high', reward: 20, probability: 'Risky' }),
      ];

      expect(decideNextAction(makeState(), ads, 0)).toEqual({ type: 'solve', adId: 'high' });
    });

    it('skips a trap when another ad exists', () => {
      const ads = [
        makeAd({ adId: 'trap', message: 'Steal super awesome diamond' }),
        makeAd({ adId: 'risky', probability: 'Risky' }),
      ];

      expect(decideNextAction(makeState(), ads, 0)).toEqual({ type: 'solve', adId: 'risky' });
    });

    it('skips steals after the cap, even when they have the best chance', () => {
      const ads = [
        makeAd({ adId: 'steal', message: 'Steal a horse', probability: 'Sure thing' }),
        makeAd({ adId: 'risky', probability: 'Risky' }),
      ];

      expect(decideNextAction(makeState(), ads, 4)).toEqual({ type: 'solve', adId: 'risky' });
    });

    it('picks a trap when only traps are left', () => {
      const ads = [makeAd({ adId: 'trap', message: 'Steal super awesome diamond' })];

      expect(decideNextAction(makeState(), ads, 0)).toEqual({ type: 'solve', adId: 'trap' });
    });

    it('returns null when there are no ads and nothing to buy', () => {
      expect(decideNextAction(makeState(), [], 0)).toBeNull();
    });
  });
});
