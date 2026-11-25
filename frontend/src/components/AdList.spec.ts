import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { Ad, Advice } from '../api/types';
import AdList from './AdList.vue';

function makeAd(overrides: Partial<Ad>): Ad {
  return {
    adId: 'x',
    message: 'Some ad',
    reward: 10,
    expiresIn: 5,
    probability: 'Sure thing',
    successRate: 1,
    expectedValue: 10,
    isTrap: false,
    reputationEffect: null,
    ...overrides,
  };
}

const ads: Ad[] = [
  makeAd({ adId: 'low', message: 'Low value', expectedValue: 5, reward: 100, expiresIn: 9 }),
  makeAd({ adId: 'high', message: 'High value', expectedValue: 50, reward: 60, expiresIn: 3 }),
  makeAd({
    adId: 'risky',
    message: 'Risky ad',
    probability: 'Gamble',
    successRate: 0.54,
    expectedValue: 20,
    reward: 40,
    expiresIn: 1,
  }),
];

function mountList(adList: Ad[], advice: Advice | null = null, busy = false) {
  return mount(AdList, { props: { ads: adList, advice, busy } });
}

function shownMessages(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('.message').map((node) => node.text());
}

describe('AdList', () => {
  it('shows the advised ad first by default, then sorts by expected value', () => {
    const wrapper = mountList(ads, { type: 'solve', adId: 'low' });

    expect(shownMessages(wrapper)).toEqual(['Low value', 'High value', 'Risky ad']);
  });

  it('shows traps last in the recommended order', () => {
    const trap = makeAd({ adId: 'trap', message: 'Trap ad', isTrap: true, expectedValue: 99 });
    const wrapper = mountList([trap, ...ads], { type: 'solve', adId: 'low' });

    expect(shownMessages(wrapper)).toEqual(['Low value', 'High value', 'Risky ad', 'Trap ad']);
  });

  it('sorts by expected value', async () => {
    const wrapper = mountList(ads, { type: 'solve', adId: 'low' });

    await wrapper.find('select').setValue('value');
    expect(shownMessages(wrapper)).toEqual(['High value', 'Risky ad', 'Low value']);
  });

  it('sorts by reward and by expiry', async () => {
    const wrapper = mountList(ads);

    await wrapper.find('select').setValue('reward');
    expect(shownMessages(wrapper)).toEqual(['Low value', 'High value', 'Risky ad']);

    await wrapper.find('select').setValue('expiry');
    expect(shownMessages(wrapper)).toEqual(['Risky ad', 'High value', 'Low value']);
  });

  it('hides risky ads when the box is checked', async () => {
    const wrapper = mountList(ads);

    await wrapper.find('input[type="checkbox"]').setValue(true);

    expect(shownMessages(wrapper)).toEqual(['High value', 'Low value']);
  });

  it('emits solve with the ad id', async () => {
    const wrapper = mountList([ads[1] as Ad]);

    await wrapper.find('li button').trigger('click');

    expect(wrapper.emitted('solve')).toEqual([['high']]);
  });

  it('disables the solve buttons while busy', () => {
    const wrapper = mountList(ads, null, true);

    const buttons = wrapper.findAll('li button');

    expect(buttons.every((button) => button.attributes('disabled') !== undefined)).toBe(true);
  });

  it('shows the reputation change of an ad if it succeeds', () => {
    const steal = makeAd({
      adId: 's',
      reputationEffect: { people: 1, state: -2, underworld: 0 },
    });
    const defend = makeAd({ adId: 'd', reputationEffect: { people: 0, state: 0, underworld: 0 } });
    const unknown = makeAd({ adId: 'u' });
    const wrapper = mountList([steal, defend, unknown]);

    const effects = wrapper.findAll('.rep-effect');

    expect(effects).toHaveLength(2);
    expect(effects[0]!.findAll('.rep-chip').map((chip) => chip.text())).toEqual([
      'People +1',
      'State -2',
    ]);
    expect(effects[1]!.text()).toContain('no change');
  });

  it('shows a trap warning', () => {
    const trap = makeAd({
      adId: 't',
      isTrap: true,
      successRate: 0.2,
      probability: 'Playing with fire',
    });
    const wrapper = mountList([trap]);

    expect(wrapper.text()).toContain('Trap!');
  });

  it('marks the ad that the advice names', () => {
    const wrapper = mountList(ads, { type: 'solve', adId: 'high' });

    const marked = wrapper.findAll('li.recommended');

    expect(marked).toHaveLength(1);
    expect(marked[0]?.text()).toContain('High value');
    expect(marked[0]?.text()).toContain('Recommended');
    expect(wrapper.text()).not.toContain('Advice: buy');
  });

  it('marks no ad and tells the user to shop when the advice is to buy', () => {
    const wrapper = mountList(ads, { type: 'buy', itemId: 'hpot' });

    expect(wrapper.findAll('li.recommended')).toHaveLength(0);
    expect(wrapper.text()).toContain('Advice: buy an item in the shop');
  });

  it('marks the card that auto-play is about to solve', () => {
    const advice: Advice = { type: 'solve', adId: 'high' };
    const wrapper = mount(AdList, { props: { ads, advice, busy: false, autoMove: advice } });

    const marked = wrapper.findAll('li.auto-move');

    expect(marked).toHaveLength(1);
    expect(marked[0]?.text()).toContain('High value');
  });
});
