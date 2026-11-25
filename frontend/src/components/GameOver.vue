<script setup lang="ts">
import dragonHead from '../assets/dragon-head.svg';
import type { Player } from '../stores/game';
import { SCORE_GOAL } from '../utils/game';

defineProps<{ player: Player; busy: boolean }>();
defineEmits<{ newGame: [] }>();
</script>

<template>
  <section
    class="over panel"
    :class="{ won: player.score >= SCORE_GOAL }"
    aria-labelledby="over-title"
  >
    <img class="art" :src="dragonHead" alt="" width="128" height="128" />
    <h2 id="over-title">Game over</h2>
    <p class="score">Final score: {{ player.score }}</p>
    <p v-if="player.score >= SCORE_GOAL" class="verdict">
      You reached the goal of {{ SCORE_GOAL }} points.
    </p>
    <p v-else class="verdict">You did not reach {{ SCORE_GOAL }} points.</p>
    <p class="details">High score: {{ player.highScore }} · Turns played: {{ player.turn }}</p>
    <button type="button" class="primary big" :disabled="busy" @click="$emit('newGame')">
      New game
    </button>
  </section>
</template>

<style scoped>
/* The end screen: a dark panel with fire from below. The content is in the middle. */
.over {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4);
  text-align: center;
  border-color: var(--color-ember-dark);
  background:
    radial-gradient(ellipse 70% 60% at 50% 100%, rgb(232 116 59 / 35%), transparent 70%),
    radial-gradient(ellipse 50% 40% at 50% 0%, rgb(120 20 20 / 40%), transparent 70%),
    var(--color-surface);
  animation: rise 500ms ease-out;
}

.over.won {
  border-color: var(--color-gold);
  box-shadow: var(--glow-gold);
}

.art {
  display: block;
  width: 6rem;
  height: 6rem;
  margin: 0 auto var(--space-3);
  filter: drop-shadow(0 0 16px rgb(232 116 59 / 70%));
}

h2 {
  justify-content: center;
  margin: 0 0 var(--space-2);
  color: var(--color-ember);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  text-shadow: 0 0 24px rgb(232 116 59 / 55%);
}

/* No gold line under this big title. */
h2::after {
  content: none;
}

.won h2 {
  color: var(--color-gold);
}

p {
  margin: 0 0 var(--space-2);
}

.score {
  color: var(--color-gold);
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
}

.verdict {
  font-family: var(--font-story);
  font-size: 1.1rem;
}

.details {
  color: var(--color-muted);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
