<script setup lang="ts">
import GameIcon from './GameIcon.vue';
</script>

<!-- The rules of the game as a list of tips. The "How to play" dialog shows it. -->
<template>
  <ul class="tips">
    <li>
      <span class="tip-icon"><GameIcon name="star" /></span>
      <span><strong>Goal:</strong> reach 1000 points. Solve ads to win gold and score.</span>
    </li>
    <li>
      <span class="tip-icon"><GameIcon name="eye" /></span>
      <span>The label of an ad shows how likely you are to win. The percent is measured.</span>
    </li>
    <li>
      <span class="tip-icon"><GameIcon name="heart" /></span>
      <span>A failed ad costs <strong>1 life</strong>. At 0 lives the game ends.</span>
    </li>
    <li>
      <span class="tip-icon"><GameIcon name="skull" /></span>
      <span>"Steal super awesome diamond" ads are <strong>traps</strong>. They always fail.</span>
    </li>
    <li>
      <span class="tip-icon"><GameIcon name="potion" /></span>
      <span>
        Healing potion: +1 life (50 gold). Items of 100 gold: +1 level. Items of 300 gold: +2
        levels.
      </span>
    </li>
    <li>
      <span class="tip-icon"><GameIcon name="shield" /></span>
      <span>A higher level makes the labels of the ads easier.</span>
    </li>
    <li>
      <span class="tip-icon"><GameIcon name="hourglass" /></span>
      <span>Every solve and every purchase costs 1 turn. Ads expire after some turns.</span>
    </li>
  </ul>
</template>

<style scoped>
.tips {
  display: grid;
  gap: var(--space-2) var(--space-5);
  margin: 0;
  padding: 0;
  font-family: var(--font-story);
  line-height: 1.5;
}

.tips li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  list-style: none;
}

/* A round ink seal for each tip. */
.tip-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ink);
  color: var(--color-gold);
}

strong {
  color: var(--ink-bad);
}

@media (min-width: 720px) {
  .tips {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
