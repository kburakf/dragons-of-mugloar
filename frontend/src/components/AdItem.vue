<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Ad } from '../api/types';
import { percent, rateClass } from '../utils/ads';
import { direction, REPUTATION_GROUPS, signed } from '../utils/reputation';
import GameIcon from './GameIcon.vue';

// autoMove: auto-play is about to solve this ad.
const props = defineProps<{ ad: Ad; recommended: boolean; busy: boolean; autoMove?: boolean }>();

defineEmits<{ solve: [adId: string] }>();

// Auto-play scrolls the card into view, so the user sees the ad before it is solved.
const card = ref<HTMLElement | null>(null);

watch(
  () => props.autoMove,
  (isMove) => {
    if (isMove) card.value?.scrollIntoView?.({ block: 'nearest' });
  },
);

// One chip for each group that the ad changes, for example "State -2".
const repChips = computed(() => {
  const effect = props.ad.reputationEffect;

  if (!effect) return [];

  return REPUTATION_GROUPS.filter(({ key }) => direction(effect[key]) !== 'none').map(
    ({ key, label }) => ({ label, value: signed(effect[key]), direction: direction(effect[key]) }),
  );
});
</script>

<template>
  <li ref="card" class="ad" :class="{ trap: ad.isTrap, recommended, 'auto-move': autoMove }">
    <span v-if="recommended" class="ribbon"><GameIcon name="star" />Recommended</span>
    <p class="badges">
      <span class="badge" :class="rateClass(ad.successRate)">
        {{ ad.probability }} ({{ percent(ad.successRate) }})
      </span>
      <span v-if="ad.isTrap" class="badge trap-badge">
        <GameIcon name="skull" />Trap! This ad always fails.
      </span>
    </p>
    <p class="message">{{ ad.message }}</p>
    <!-- The measured reputation change if the ad succeeds. A trap always fails, so it has none. -->
    <p v-if="ad.reputationEffect && !ad.isTrap" class="rep-effect">
      <span>Reputation:</span>
      <span v-for="chip in repChips" :key="chip.label" class="rep-chip" :class="chip.direction">
        {{ chip.label }} {{ chip.value }}
      </span>
      <span v-if="repChips.length === 0" class="rep-chip">no change</span>
    </p>
    <p class="numbers">
      <span class="number reward"><GameIcon name="coin" />Reward: {{ ad.reward }} gold</span>
      <span class="number"
        ><GameIcon name="star" />Expected value: {{ ad.expectedValue.toFixed(1) }}</span
      >
      <span class="number"><GameIcon name="hourglass" />Expires in: {{ ad.expiresIn }} turns</span>
    </p>
    <button
      type="button"
      class="solve"
      :class="{ primary: recommended }"
      :disabled="busy"
      @click="$emit('solve', ad.adId)"
    >
      Solve
    </button>
  </li>
</template>

<style scoped>
/* A parchment card with dark ink. */
.ad {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  list-style: none;
  padding: var(--space-2) var(--space-3) var(--space-3);
  border: 1px solid var(--parchment-edge);
  border-radius: var(--radius-small);
  background:
    radial-gradient(ellipse at 50% 0%, rgb(255 255 255 / 45%), transparent 70%),
    linear-gradient(180deg, var(--parchment), var(--parchment-edge));
  color: var(--ink);
  box-shadow: var(--shadow);
  transition:
    transform var(--transition),
    box-shadow var(--transition);
  /* Room for the ribbon when auto-play scrolls the card into view. */
  scroll-margin-top: var(--space-4);
}

.ad:hover {
  transform: translateY(-2px);
}

/* The advised ad glows in gold and has a ribbon. */
.ad.recommended {
  padding-top: var(--space-4);
  box-shadow: var(--glow-gold);
}

.ribbon {
  position: absolute;
  top: -0.8rem;
  left: var(--space-3);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.15rem 0.75rem;
  border-radius: var(--radius-small);
  background: linear-gradient(180deg, var(--color-gold), var(--color-ember));
  color: var(--color-on-accent);
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 8px rgb(0 0 0 / 40%);
}

/* Auto-play is about to solve this ad: an ember glow that pulses. */
.ad.auto-move {
  transform: translateY(-2px);
  box-shadow: var(--glow-auto);
  animation: auto-glow 0.6s ease-in-out infinite;
}

/* A trap card is stained red and has a striped top edge. */
.ad.trap {
  border-color: var(--ink-bad);
  background:
    repeating-linear-gradient(-45deg, var(--ink-bad) 0 8px, #2b0f0c 8px 16px) top / 100% 6px
      no-repeat,
    linear-gradient(180deg, #f6dccf, #e9bfae);
}

.ad.trap .message {
  text-decoration: line-through;
  text-decoration-color: rgb(156 31 22 / 60%);
}

p {
  margin: 0;
}

.message {
  font-family: var(--font-story);
  font-size: 0.95rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-3);
  color: var(--ink-muted);
  font-size: 0.8rem;
}

.number {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.number.reward {
  color: var(--ink);
  font-weight: 700;
}

.number .icon {
  color: var(--ink-warn);
}

.rep-effect {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  color: var(--ink-muted);
  font-size: 0.75rem;
}

.rep-chip {
  padding: 0 0.4rem;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-weight: 700;
}

.rep-chip.up {
  background: var(--ink-good-bg);
  color: var(--ink-good);
}

.rep-chip.down {
  background: var(--ink-bad-bg);
  color: var(--ink-bad);
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.1rem 0.6rem;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.badge.good {
  background: var(--ink-good-bg);
  color: var(--ink-good);
}

.badge.medium {
  background: var(--ink-warn-bg);
  color: var(--ink-warn);
}

.badge.bad {
  background: var(--ink-bad-bg);
  color: var(--ink-bad);
}

.trap-badge {
  background: var(--ink-bad);
  color: #fff;
  border-color: var(--ink-bad);
}

.solve {
  align-self: flex-start;
  min-width: 7rem;
  min-height: 2rem;
  /* The button stays at the bottom, so the buttons of a card row line up. */
  margin-top: auto;
  padding: 0.2rem 0.75rem;
}

/* A dark button on the light parchment. */
.solve:not(.primary, :disabled) {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--parchment);
}

.solve:focus-visible {
  outline-color: var(--color-ember-dark);
}
</style>
