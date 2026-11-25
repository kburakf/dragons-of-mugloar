<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '../stores/game';
import { LOW_LIVES, SCORE_GOAL } from '../utils/game';
import GameIcon from './GameIcon.vue';

const props = defineProps<{ player: Player }>();

// More hearts than this do not fit on a phone. The number shows the real value.
const MAX_HEARTS = 5;

// At 0 lives the game is over, so a potion no longer helps.
const livesLow = computed(() => props.player.lives > 0 && props.player.lives <= LOW_LIVES);
const hearts = computed(() => Math.min(Math.max(props.player.lives, 0), MAX_HEARTS));
const goalPercent = computed(() => Math.min(100, (props.player.score / SCORE_GOAL) * 100));
</script>

<template>
  <section class="status panel" aria-label="Player status">
    <dl class="stats">
      <div class="stat score">
        <dt><GameIcon name="star" />Score</dt>
        <dd>
          {{ player.score }} <span class="goal">/ {{ SCORE_GOAL }} goal</span>
          <span class="progress" aria-hidden="true">
            <span class="progress-fill" :style="{ width: `${goalPercent}%` }"></span>
          </span>
        </dd>
      </div>
      <div class="stat gold">
        <dt><GameIcon name="coin" />Gold</dt>
        <dd>{{ player.gold }}</dd>
      </div>
      <div class="stat lives" :class="{ low: livesLow }">
        <dt><GameIcon name="heart" />Lives</dt>
        <dd>
          {{ player.lives }}
          <span class="hearts" aria-hidden="true">
            <GameIcon v-for="n in hearts" :key="n" name="heart" />
          </span>
        </dd>
      </div>
      <div class="stat level">
        <dt><GameIcon name="shield" />Level</dt>
        <dd>{{ player.level }}</dd>
      </div>
      <div class="stat turn">
        <dt><GameIcon name="hourglass" />Turn</dt>
        <dd>{{ player.turn }}</dd>
      </div>
    </dl>
    <p v-if="livesLow" class="low-text" role="status">
      <GameIcon name="warning" />Low lives! Buy a healing potion.
    </p>
    <!-- Extra controls from the parent, for example auto-play. -->
    <slot />
  </section>
</template>

<style scoped>
/* A compact HUD: the stats and the low lives warning in one row on desktop. */
.status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-color: var(--color-gold-dark);
}

/* On a phone: the score on one row, the 4 other stats on the next row. */
.stats {
  display: grid;
  flex: 1 1 30rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.stat {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: rgb(0 0 0 / 25%);
}

.stat.score {
  grid-column: 1 / -1;
}

.stat dt {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-muted);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stat dd {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-1) var(--space-2);
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Each stat has its own icon color. */
.score dt .icon,
.score dd {
  color: var(--color-gold);
}

.gold dt .icon {
  color: var(--color-gold);
}

.lives dt .icon,
.hearts {
  color: #ff6b6b;
}

.level dt .icon {
  color: #8fb8ff;
}

.turn dt .icon {
  color: var(--color-muted);
}

.goal {
  color: var(--color-muted);
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 400;
}

.hearts {
  display: inline-flex;
  gap: 2px;
  font-size: 1rem;
}

.progress {
  flex-basis: 100%;
  height: 6px;
  margin-top: var(--space-1);
  overflow: hidden;
  border-radius: 999px;
  background: #3a3038;
}

.progress-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--color-ember), var(--color-gold));
  transition: width 400ms ease-out;
}

/* The low lives warning: a red frame that pulses slowly. */
.stat.low {
  border-color: var(--color-bad);
  background: var(--color-bad-bg);
  animation: pulse 1.6s ease-in-out infinite;
}

.stat.low dd {
  color: var(--color-bad);
}

@keyframes pulse {
  50% {
    box-shadow: 0 0 14px rgb(255 107 107 / 55%);
  }
}

.low-text {
  display: flex;
  flex: 1 1 12rem;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-small);
  background: var(--color-bad-bg);
  color: var(--color-bad);
  font-weight: 600;
}

/* More hearts do not fit on a phone. The number shows the lives. */
@media (max-width: 899px) {
  .hearts {
    display: none;
  }
}

@media (min-width: 640px) {
  .stats {
    grid-template-columns: minmax(0, 2fr) repeat(4, minmax(0, 1fr));
  }

  .stat.score {
    grid-column: auto;
  }
}
</style>
