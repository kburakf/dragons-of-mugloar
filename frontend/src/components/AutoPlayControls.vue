<script setup lang="ts">
import type { Speed } from '../composables/useAutoPlay';

defineProps<{ running: boolean; canStart: boolean; status: string | null }>();
defineEmits<{ start: []; stop: [] }>();
const speed = defineModel<Speed>('speed', { required: true });
</script>

<template>
  <div class="autoplay" :class="{ running }" role="group" aria-label="Auto-play">
    <!-- One button for Start and Stop, so the keyboard focus stays on it after a click. -->
    <button
      type="button"
      class="small toggle"
      :class="{ primary: !running }"
      :disabled="!running && !canStart"
      @click="running ? $emit('stop') : $emit('start')"
    >
      <span v-if="running" class="dot" aria-hidden="true"></span>
      {{ running ? 'Stop auto-play' : 'Start auto-play' }}
    </button>
    <label class="speed">
      <span class="speed-label">Speed</span>
      <select v-model="speed">
        <option value="slow">Slow</option>
        <option value="normal">Normal</option>
        <option value="fast">Fast</option>
      </select>
    </label>
    <!-- role="status" reads the text to screen readers when it changes. -->
    <p class="status-text" role="status">{{ status }}</p>
  </div>
</template>

<style scoped>
/* One row: the button, the speed and the status. The status wraps on a small screen. */
.autoplay {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: rgb(0 0 0 / 25%);
}

.autoplay.running {
  border-color: var(--color-ember);
  box-shadow: var(--glow-auto);
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 9.5rem;
  justify-content: center;
}

/* An ember dot that glows while auto-play runs, like a "recording" light. */
.dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--color-ember);
  animation: auto-glow 1s ease-in-out infinite;
}

.speed {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.speed-label {
  color: var(--color-muted);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.speed select {
  min-height: 2rem;
  padding-top: 0.1rem;
  padding-bottom: 0.1rem;
  font-size: 0.85rem;
}

.status-text {
  flex: 1 1 10rem;
  max-width: 16rem;
  margin: 0;
  color: var(--color-muted);
  font-size: 0.8rem;
}

/* No text yet: the box takes no space, but it stays for screen readers. */
.status-text:empty {
  flex: 0 0 0;
}

.running .status-text {
  color: var(--color-gold);
}

/*
 * On a phone, the glowing Stop button shows that auto-play runs. The status text is
 * hidden only on the screen, so screen readers still read it. A stop reason shows again.
 */
@media (max-width: 899px) {
  .running .status-text {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
