import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TabBar from './TabBar.vue';

const tabs = [
  { id: 'quests', label: 'Quests', panel: 'panel-play' },
  { id: 'shop', label: 'Shop', panel: 'panel-play' },
];

describe('TabBar', () => {
  it('marks the selected tab and keeps only that tab in the Tab order', () => {
    const wrapper = mount(TabBar, { props: { tabs, modelValue: 'shop', label: 'Sections' } });

    const [quests, shop] = wrapper.findAll('[role="tab"]');

    expect(shop?.attributes('aria-selected')).toBe('true');
    expect(shop?.attributes('tabindex')).toBe('0');
    expect(quests?.attributes('tabindex')).toBe('-1');
  });

  it('selects a tab on click and with the arrow keys', async () => {
    const wrapper = mount(TabBar, { props: { tabs, modelValue: 'quests', label: 'Sections' } });

    await wrapper.findAll('[role="tab"]')[1]?.trigger('click');
    await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' });
    await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowLeft' });

    // From "quests": click selects "shop", ArrowRight goes to "shop", ArrowLeft wraps to "shop".
    expect(wrapper.emitted('update:modelValue')).toEqual([['shop'], ['shop'], ['shop']]);
  });
});
