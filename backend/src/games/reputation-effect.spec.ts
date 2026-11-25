import { Ad } from '../mugloar/mugloar.schemas';
import { reputationEffect } from './reputation-effect';

function adWith(message: string): Ad {
  return { adId: 'a1', message, reward: 10, expiresIn: 7, probability: 'Sure thing' };
}

describe('reputationEffect', () => {
  it('gives the measured change for a known ad type', () => {
    const steal = adWith(
      'Steal pan delivery to Kelsey Hadaway and share some of the profits with the people.',
    );

    expect(reputationEffect(steal)).toEqual({ people: 1, state: -2, underworld: 0 });
    expect(
      reputationEffect(adWith('Infiltrate The Eagle Soldiers and recover their secrets.')),
    ).toEqual({ people: 0, state: 2, underworld: -1 });
    expect(reputationEffect(adWith('Escort Dafne Ecclestone to plains in Darkdean'))).toEqual({
      people: 0.1,
      state: 0,
      underworld: 0,
    });
  });

  it('gives no change for the trap and for "Help defending"', () => {
    const none = { people: 0, state: 0, underworld: 0 };

    expect(
      reputationEffect(adWith('Steal super awesome diamond pan from Fátima Tennison')),
    ).toEqual(none);
    expect(reputationEffect(adWith('Help defending meadow in Redfire from the intruders'))).toEqual(
      none,
    );
  });

  it('returns null for an ad type that was not measured', () => {
    expect(reputationEffect(adWith('Slay the moon'))).toBeNull();
  });

  it('returns a copy, so a caller cannot change the rule', () => {
    const ad = adWith('Escort Tom to the hill');

    reputationEffect(ad)!.people = 99;
    expect(reputationEffect(ad)?.people).toBe(0.1);
  });
});
