<script setup lang="ts">
import dragonHead from '../assets/dragon-head.svg';
</script>

<template>
  <header class="header">
    <!-- Decoration only, so the alt text is empty. -->
    <span class="emblem">
      <img :src="dragonHead" alt="" width="30" height="30" />
    </span>
    <div>
      <h1>Dragons of Mugloar</h1>
      <p class="tagline">Take quests, earn gold, stay alive.</p>
    </div>
    <!-- Extra controls from the parent, on the right side. -->
    <div class="tools"><slot /></div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* A round medallion. The background color stays if the image does not load. */
.emblem {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border: 2px solid var(--color-gold-dark);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #4a2418, var(--color-surface) 70%);
  box-shadow: 0 0 18px rgb(232 116 59 / 45%);
}

h1 {
  margin: 0;
  color: var(--color-gold);
  font-size: clamp(1.1rem, 2.5vw, 1.6rem);
  line-height: 1.1;
  text-shadow: 0 0 18px rgb(232 116 59 / 45%);
}

.tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-left: auto;
}

.tagline {
  margin: 0;
  color: var(--color-muted);
  font-family: var(--font-story);
  font-size: 0.9rem;
  font-style: italic;
}

/* On a phone the header is small: no tagline. */
@media (max-width: 899px) {
  .tagline {
    display: none;
  }
}
</style>
