import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { Advice, ShopItem } from '../api/types';
import ShopPanel from './ShopPanel.vue';

const items: ShopItem[] = [
  { id: 'hpot', name: 'Healing potion', cost: 50 },
  { id: 'cs', name: 'Claw Sharpening', cost: 100 },
];

function mountShop(gold: number, advice: Advice | null = null, busy = false) {
  return mount(ShopPanel, { props: { items, gold, advice, busy } });
}

describe('ShopPanel', () => {
  it('disables the buy button when gold is too low', () => {
    const wrapper = mountShop(70);

    const [potion, sharpening] = wrapper.findAll('button');

    expect(potion?.attributes('disabled')).toBeUndefined();
    expect(sharpening?.attributes('disabled')).toBeDefined();
  });

  it('emits buy with the item id', async () => {
    const wrapper = mountShop(100);

    await wrapper.findAll('button')[1]?.trigger('click');

    expect(wrapper.emitted('buy')).toEqual([['cs']]);
  });

  it('disables all buttons while busy', () => {
    const wrapper = mountShop(1000, null, true);

    expect(wrapper.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(
      true,
    );
  });

  it('shows the effect of each item', () => {
    const wrapper = mountShop(0);

    expect(wrapper.text()).toContain('+1 life');
    expect(wrapper.text()).toContain('+1 level');
  });

  it('highlights the potion and gives the reason when the advice is a potion', () => {
    const wrapper = mountShop(100, { type: 'buy', itemId: 'hpot' });

    const [potion, sharpening] = wrapper.findAll('li');

    expect(potion?.classes()).toContain('highlight');
    expect(potion?.find('.mark').text()).toBe('recommended');
    expect(potion?.text()).not.toContain('Recommended');
    expect(potion?.find('.badge').exists()).toBe(false);
    expect(sharpening?.classes()).not.toContain('highlight');
    expect(wrapper.text()).toContain('Low on lives: buy a potion.');
  });

  it('highlights a level item and gives the reason when the advice is a level item', () => {
    const wrapper = mountShop(100, { type: 'buy', itemId: 'cs' });

    const [potion, sharpening] = wrapper.findAll('li');

    expect(potion?.classes()).not.toContain('highlight');
    expect(sharpening?.classes()).toContain('highlight');
    expect(sharpening?.find('.mark').text()).toBe('recommended');
    expect(sharpening?.text()).not.toContain('Recommended');
    expect(wrapper.text()).toContain(
      'Level is behind or no ad is safe: buy this level item. Items are bought in turn, so every skill grows.',
    );
  });

  it('shows the advised item in a box at the top with its own buy button', async () => {
    const wrapper = mountShop(500, { type: 'buy', itemId: 'cs' });

    const box = wrapper.find('.advice');

    expect(box.text()).toContain('Claw Sharpening');
    await box.find('button').trigger('click');
    expect(wrapper.emitted('buy')).toEqual([['cs']]);
  });

  it('highlights nothing when there is no advice or the advice is to solve', () => {
    for (const advice of [null, { type: 'solve', adId: 'a1' } as const]) {
      const wrapper = mountShop(100, advice);

      expect(wrapper.findAll('li.highlight')).toHaveLength(0);
      expect(wrapper.text()).not.toContain('Recommended');
    }
  });

  it('marks the advice box when auto-play is about to buy', () => {
    const advice: Advice = { type: 'buy', itemId: 'hpot' };
    const wrapper = mount(ShopPanel, {
      props: { items, gold: 100, advice, busy: false, autoMove: advice },
    });

    expect(wrapper.find('.advice.auto-move').text()).toContain('Healing potion');
  });
});
