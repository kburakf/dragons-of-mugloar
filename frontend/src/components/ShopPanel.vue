<script setup lang="ts">
import { computed } from 'vue';
import type { Advice, ShopItem } from '../api/types';
import { isPotion, itemEffect } from '../utils/game';
import GameIcon from './GameIcon.vue';

const props = defineProps<{
  items: ShopItem[];
  gold: number;
  advice: Advice | null;
  busy: boolean;
  // The move that auto-play is about to run. Null when auto-play is off.
  autoMove?: Advice | null;
}>();

defineEmits<{ buy: [itemId: string] }>();

function canAfford(item: ShopItem): boolean {
  return props.gold >= item.cost;
}

// The icon follows the effect: potion for a life, sword for 1 level, gem for 2 levels.
function itemIcon(item: ShopItem): 'potion' | 'sword' | 'gem' {
  if (isPotion(item)) return 'potion';

  return item.cost >= 300 ? 'gem' : 'sword';
}

function isRecommended(item: ShopItem): boolean {
  return props.advice?.type === 'buy' && props.advice.itemId === item.id;
}

// The advised item stays in its place in the list, so the buttons do not move after each turn.
// A box at the top shows it again, so it is visible without scrolling.
const recommendedItem = computed(() => props.items.find(isRecommended) ?? null);

// The reason for the advice. The backend advises a potion only when lives are low.
const reason = computed(() => {
  const item = recommendedItem.value;

  if (!item) return null;

  return isPotion(item)
    ? 'Low on lives: buy a potion.'
    : 'Level is behind or no ad is safe: buy this level item. Items are bought in turn, so every skill grows.';
});
</script>

<template>
  <section class="shop panel" aria-labelledby="shop-title">
    <h2 id="shop-title">Shop</h2>
    <div
      v-if="recommendedItem"
      class="advice"
      :class="{ 'auto-move': autoMove?.type === 'buy' && autoMove.itemId === recommendedItem.id }"
    >
      <div class="advice-item" :class="itemIcon(recommendedItem)">
        <span class="item-icon">
          <GameIcon :name="itemIcon(recommendedItem)" />
        </span>
        <div class="info">
          <p class="advice-label">Recommended</p>
          <p class="name">{{ recommendedItem.name }}</p>
          <p class="effect">
            {{ itemEffect(recommendedItem) }} ·
            <span class="cost" :class="{ short: !canAfford(recommendedItem) }">
              <GameIcon name="coin" />{{ recommendedItem.cost }} gold
            </span>
          </p>
        </div>
        <button
          type="button"
          class="small primary"
          :disabled="busy || !canAfford(recommendedItem)"
          :aria-label="`Buy the recommended item, ${recommendedItem.name}`"
          @click="$emit('buy', recommendedItem.id)"
        >
          Buy
        </button>
      </div>
      <p class="reason">{{ reason }}</p>
    </div>
    <ul class="items">
      <li
        v-for="item in items"
        :key="item.id"
        class="item"
        :class="[itemIcon(item), { highlight: isRecommended(item) }]"
      >
        <span class="item-icon"><GameIcon :name="itemIcon(item)" /></span>
        <div class="info">
          <p class="name">
            {{ item.name }}
            <span v-if="isRecommended(item)" class="mark">
              <GameIcon name="star" aria-hidden="true" />
              <span class="visually-hidden">recommended</span>
            </span>
          </p>
          <p class="effect">
            {{ itemEffect(item) }} ·
            <span class="cost" :class="{ short: !canAfford(item) }">
              <GameIcon name="coin" />{{ item.cost }} gold
            </span>
          </p>
        </div>
        <button
          type="button"
          class="small"
          :disabled="busy || !canAfford(item)"
          :aria-label="`Buy ${item.name}`"
          @click="$emit('buy', item.id)"
        >
          Buy
        </button>
      </li>
    </ul>
    <p v-if="items.length === 0" class="empty">The shop is empty.</p>
  </section>
</template>

<style scoped>
/* The shop scrolls inside when the screen is too low for all items. */
.shop {
  min-height: 0;
  overflow-y: auto;
}

.items {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  list-style: none;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: rgb(0 0 0 / 25%);
  transition: border-color var(--transition);
}

.item:hover {
  border-color: var(--color-gold-dark);
}

/* A round slot for the item icon. Each item type has its own color. */
.item-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: #141117;
  font-size: 1.1rem;
}

.potion .item-icon {
  color: #ff7b8a;
}

.sword .item-icon {
  color: #c9d3e0;
}

.gem .item-icon {
  color: #7fd4ff;
}

.info {
  flex: 1;
  min-width: 0;
}

/* The advised item gets only a thin gold edge. The box at the top is the strong signal. */
.item.highlight {
  border-left: 3px solid var(--color-gold);
}

.mark {
  color: var(--color-gold);
  margin-left: var(--space-1);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* The box with the advised item, at the top of the shop. */
.advice {
  display: grid;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 2px solid var(--color-gold);
  border-radius: var(--radius-small);
  background: var(--color-good-bg);
  box-shadow: var(--glow-gold);
}

/* Auto-play is about to buy this item. */
.advice.auto-move {
  border-color: var(--color-ember);
  box-shadow: var(--glow-auto);
  animation: auto-glow 0.6s ease-in-out infinite;
}

.advice-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.advice-label {
  color: var(--color-gold);
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.reason {
  color: var(--color-good);
  font-size: 0.8rem;
  font-weight: 600;
}

p {
  margin: 0;
}

.name {
  font-size: 0.9rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.effect,
.empty {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.cost {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: var(--color-gold);
}

.cost.short {
  color: var(--color-bad);
}
</style>
