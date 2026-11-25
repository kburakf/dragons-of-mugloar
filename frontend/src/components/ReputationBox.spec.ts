import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ReputationBox from './ReputationBox.vue';

const ZERO = { people: 0, state: 0, underworld: 0 };

function mountBox(props: Partial<InstanceType<typeof ReputationBox>['$props']> = {}) {
  return mount(ReputationBox, {
    props: {
      reputation: null,
      previous: ZERO,
      expectedChange: ZERO,
      solvedSinceCheck: 0,
      busy: false,
      ...props,
    },
  });
}

describe('ReputationBox', () => {
  it('shows 0 in each group before the first check', () => {
    const wrapper = mountBox();

    expect(wrapper.findAll('.value').map((value) => value.text())).toEqual(['0', '0', '0']);
    expect(wrapper.text()).toContain('Not checked yet');
  });

  it('shows the values with signs and the change since the check before', () => {
    const wrapper = mountBox({
      reputation: { people: 2.1, state: -4, underworld: 0 },
      previous: { people: 1, state: -2, underworld: 0 },
    });

    expect(wrapper.findAll('.value').map((value) => value.text())).toEqual(['+2.1', '-4', '0']);
    expect(wrapper.findAll('.change').map((change) => change.text())).toEqual(['▲+1.1', '▼-2']);
  });

  it('shows the expected change of the quests solved since the last check', () => {
    const wrapper = mountBox({
      expectedChange: { people: 1.1, state: -2, underworld: 0 },
      solvedSinceCheck: 2,
    });

    expect(wrapper.find('.expected').text()).toContain('2 solved quests');
    expect(wrapper.find('.expected').text()).toContain('People +1.1, State -2');
  });

  it('warns about traps when the expected State is low', () => {
    const lowSoon = mountBox({
      reputation: { people: 3, state: -6, underworld: 0 },
      expectedChange: { people: 1, state: -2, underworld: 0 },
      solvedSinceCheck: 1,
    });
    const fine = mountBox({ reputation: { people: 3, state: -6, underworld: 0 } });

    expect(lowSoon.find('.warning').text()).toContain('State is about -8');
    expect(fine.find('.warning').exists()).toBe(false);
  });

  it('asks to investigate', async () => {
    const wrapper = mountBox();

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('investigate')).toHaveLength(1);
  });
});
