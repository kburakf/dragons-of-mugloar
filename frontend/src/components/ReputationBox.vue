<script setup lang="ts">
import { computed } from 'vue';
import type { Reputation } from '../api/types';
import {
  direction,
  addReputation,
  effectText,
  meterScale,
  meterWidth,
  NO_REPUTATION,
  REPUTATION_GROUPS,
  signed,
  subtractReputation,
  trapWarning,
} from '../utils/reputation';
import GameIcon from './GameIcon.vue';

const props = defineProps<{
  // The last check. Null before the first check.
  reputation: Reputation | null;
  // The check before the last check (0 in each group at the start of a game).
  previous: Reputation;
  // The measured effects of the ads solved since the last check.
  expectedChange: Reputation;
  solvedSinceCheck: number;
  busy: boolean;
}>();

defineEmits<{ investigate: [] }>();

// A new game starts at 0 in each group, so before the first check the meters show 0.
const shown = computed(() => props.reputation ?? NO_REPUTATION);
const change = computed(() => subtractReputation(shown.value, props.previous));
const scale = computed(() => meterScale(shown.value));
// The last check plus the quests solved since then. The warning uses it, so it needs no extra turn.
const estimatedState = computed(() => addReputation(shown.value, props.expectedChange).state);
</script>

<template>
  <section class="reputation panel" aria-labelledby="reputation-title">
    <h2 id="reputation-title">Reputation</h2>

    <ul class="meters">
      <li v-for="group in REPUTATION_GROUPS" :key="group.key" class="row">
        <span class="name">{{ group.label }}</span>
        <!-- The bar starts at the middle: to the right for a positive value, to the left for a negative value. -->
        <span class="meter" aria-hidden="true">
          <span
            class="fill"
            :class="direction(shown[group.key])"
            :style="{ width: `${meterWidth(shown[group.key], scale)}%` }"
          ></span>
        </span>
        <!-- The value sits over the 0 line of the meter. The change is to its right. -->
        <span class="value" :class="direction(shown[group.key])">
          {{ signed(shown[group.key]) }}
        </span>
        <span
          v-if="reputation && direction(change[group.key]) !== 'none'"
          class="change"
          :class="direction(change[group.key])"
          :title="`Change since the check before: ${signed(change[group.key])}`"
        >
          {{ direction(change[group.key]) === 'up' ? '▲' : '▼' }}{{ signed(change[group.key]) }}
        </span>
      </li>
    </ul>

    <p class="note">
      <template v-if="!reputation">Not checked yet. A new game starts at 0.</template>
      <template v-else>Arrows: the change since the check before.</template>
    </p>
    <p v-if="solvedSinceCheck > 0" class="expected">
      <GameIcon name="star" />
      <span>
        Expected from {{ solvedSinceCheck }} solved
        {{ solvedSinceCheck === 1 ? 'quest' : 'quests' }} since the last check:
        <strong>{{ effectText(expectedChange) }}</strong>
      </span>
    </p>

    <p v-if="trapWarning(estimatedState)" class="warning" role="status">
      <GameIcon name="skull" />
      <span>
        State is about {{ signed(estimatedState) }}. In our tests, trap ads came at State -10 or
        lower. Infiltrate and Investigate raise State.
      </span>
    </p>

    <button type="button" :disabled="busy" @click="$emit('investigate')">
      <GameIcon name="eye" /> Investigate (costs 1 turn)
    </button>

    <details class="help">
      <summary>What changes it?</summary>
      <ul>
        <li>Only a successful quest. A failed quest changes nothing.</li>
        <li>Steal ... delivery: People +1, State -2.</li>
        <li>Infiltrate: State +2, Underworld -1.</li>
        <li>Investigate: State +1, People -0.1.</li>
        <li>Advertisement, novel: People +1.</li>
        <li>Other Help, Escort, Rescue: People +0.1 to +0.3.</li>
        <li>Help defending: no change.</li>
      </ul>
      <p>
        Effect on the game: trap ads came only at State -10 or lower, and stopped when State went up
        (a pattern, not a proof). We found no effect on success rates, rewards or labels.
      </p>
    </details>
  </section>
</template>

<style scoped>
.meters {
  display: grid;
  gap: var(--space-1);
  margin: 0 0 var(--space-2);
  padding: 0;
}

/*
 * Name on the left of the first line. The value sits in the middle, over the 0 line of the meter,
 * and the change is to its right.
 * The meter is under them and uses the full width.
 */
.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  grid-template-areas:
    'name value change'
    'meter meter meter';
  align-items: baseline;
  column-gap: var(--space-2);
  list-style: none;
  font-size: 0.85rem;
}

.name {
  grid-area: name;
  color: var(--color-muted);
}

/* A dark slot with a thin line at the middle, which is 0. */
.meter {
  grid-area: meter;
  position: relative;
  height: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #141117;
  overflow: hidden;
}

.meter::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: var(--color-muted);
}

.fill {
  position: absolute;
  top: 0;
  bottom: 0;
  transition: width var(--transition);
}

.fill.up {
  left: 50%;
  background: linear-gradient(90deg, var(--color-gold-dark), var(--color-good));
}

.fill.down {
  right: 50%;
  background: linear-gradient(270deg, var(--color-ember-dark), var(--color-bad));
}

.value {
  grid-area: value;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.up {
  color: var(--color-good);
}

.down {
  color: var(--color-bad);
}

.none {
  color: var(--color-muted);
}

.change {
  grid-area: change;
  font-size: 0.75rem;
  white-space: nowrap;
}

.note,
.expected {
  margin: 0 0 var(--space-2);
  color: var(--color-muted);
  font-size: 0.8rem;
}

.expected {
  display: flex;
  gap: var(--space-1);
  color: var(--color-text);
}

.warning {
  display: flex;
  gap: var(--space-1);
  margin: 0 0 var(--space-2);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-bad);
  border-radius: var(--radius-small);
  background: var(--color-bad-bg);
  color: var(--color-bad);
  font-size: 0.8rem;
}

.warning .icon {
  margin-top: 0.15em;
}

.expected .icon {
  margin-top: 0.15em;
  color: var(--color-gold);
}

.help {
  margin-top: var(--space-2);
  color: var(--color-muted);
  font-size: 0.8rem;
}

.help summary {
  color: var(--color-gold);
  cursor: pointer;
}

.help ul {
  margin: var(--space-1) 0;
  padding-left: 1.1rem;
}

.help p {
  margin: 0;
}

button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
