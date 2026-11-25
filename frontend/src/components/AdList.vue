<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Ad, Advice } from '../api/types';
import { isRisky, sortAds, type SortKey } from '../utils/ads';
import AdItem from './AdItem.vue';
import GameIcon from './GameIcon.vue';

// autoMove: the move that auto-play is about to run. Null when auto-play is off.
const props = defineProps<{
  ads: Ad[];
  advice: Advice | null;
  busy: boolean;
  autoMove?: Advice | null;
}>();

defineEmits<{ solve: [adId: string]; refresh: [] }>();

const sortKey = ref<SortKey>('recommended');
const hideRisky = ref(false);

const visibleAds = computed(() => {
  const ads = hideRisky.value ? props.ads.filter((ad) => !isRisky(ad)) : props.ads;
  const recommendedAdId = props.advice?.type === 'solve' ? props.advice.adId : null;

  return sortAds(ads, sortKey.value, recommendedAdId);
});
</script>

<template>
  <section class="board panel" aria-labelledby="ads-title">
    <h2 id="ads-title">Ads</h2>
    <div class="tools">
      <label class="sort">
        <span class="sort-label">Sort by</span>
        <select v-model="sortKey">
          <option value="recommended">Recommended</option>
          <option value="value">Expected value</option>
          <option value="reward">Reward</option>
          <option value="expiry">Expires soon</option>
        </select>
      </label>
      <label class="check">
        <input v-model="hideRisky" type="checkbox" />
        Hide risky ads
      </label>
      <button type="button" class="refresh" :disabled="busy" @click="$emit('refresh')">
        Refresh ads
      </button>
    </div>
    <p class="hint">Risky means a success rate under 85%, or a trap.</p>
    <p
      v-if="advice?.type === 'buy'"
      class="advice"
      :class="{ 'auto-move': autoMove?.type === 'buy' }"
    >
      <GameIcon name="potion" />Advice: buy an item in the shop before you solve an ad.
    </p>

    <ul v-if="visibleAds.length > 0" class="list">
      <AdItem
        v-for="ad in visibleAds"
        :key="ad.adId"
        :ad="ad"
        :recommended="advice?.type === 'solve' && advice.adId === ad.adId"
        :busy="busy"
        :auto-move="autoMove?.type === 'solve' && autoMove.adId === ad.adId"
        @solve="$emit('solve', $event)"
      />
    </ul>
    <p v-else class="empty">No ads to show.</p>
  </section>
</template>

<style scoped>
/* A dark wood board behind the parchment cards. Only the card list scrolls. */
.board {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background:
    repeating-linear-gradient(90deg, rgb(0 0 0 / 12%) 0 1px, transparent 1px 90px),
    linear-gradient(180deg, #2e2219, #1f1813);
  border-color: #5b4330;
}

/*
 * The toolbar. On a phone: sort on the first row, filter and refresh on the second row.
 * On a wider screen: one row, and the refresh button goes to the right.
 */
.tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: rgb(0 0 0 / 30%);
}

.sort {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  gap: var(--space-2);
}

.sort-label {
  color: var(--color-muted);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.sort select {
  flex: 1;
  min-width: 0;
}

/* The checkbox looks like a chip, so it has the same height as the other controls. */
.check {
  display: flex;
  align-items: center;
  justify-self: start;
  gap: var(--space-2);
  min-height: 2.5rem;
  padding: 0 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-surface);
  cursor: pointer;
  white-space: nowrap;
}

.check:has(input:checked) {
  border-color: var(--color-ember);
  color: var(--color-gold);
}

.refresh {
  padding: 0.4rem 0.75rem;
}

@media (min-width: 480px) {
  .tools {
    display: flex;
    flex-wrap: wrap;
  }

  .sort {
    flex: 1 1 14rem;
  }

  .refresh {
    margin-left: auto;
  }
}

.hint {
  margin: var(--space-1) 0 var(--space-2);
  font-size: 0.85rem;
  color: var(--color-muted);
}

.advice {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-good);
  border-radius: var(--radius-small);
  background: var(--color-good-bg);
  color: var(--color-good);
  font-weight: 600;
}

/* Auto-play is about to buy the advised item. On a phone, the shop is on another tab. */
.advice.auto-move {
  box-shadow: var(--glow-auto);
  animation: auto-glow 0.6s ease-in-out infinite;
}

/*
 * The cards fill as many columns as fit (at least 14rem wide).
 * The top padding leaves room for the "Recommended" ribbon.
 */
.list {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  align-content: start;
  gap: 1.1rem var(--space-3);
  min-height: 0;
  margin: 0;
  padding: 0.9rem var(--space-1) var(--space-1);
  overflow-y: auto;
}

.empty {
  color: var(--color-muted);
}
</style>
