<script setup lang="ts">
import { computed } from 'vue';
import type { LogEntry } from '../stores/game';
import type { IconName } from '../utils/icons';
import GameIcon from './GameIcon.vue';

// compact: on a phone, show only the newest entry (the full list is on its own tab).
const props = defineProps<{ entries: LogEntry[]; compact: boolean }>();

// The newest entries are always visible. The older entries are in a closed list.
const RECENT_COUNT = 3;
const recent = computed(() => props.entries.slice(0, RECENT_COUNT));
const older = computed(() => props.entries.slice(RECENT_COUNT));

type EntryType = 'success' | 'failure' | 'purchase' | 'info';

// A failure is always red. Otherwise the action gives the type.
function entryType(entry: LogEntry): EntryType {
  if (entry.kind === 'bad') return 'failure';
  if (entry.action === 'buy') return 'purchase';
  if (entry.action === 'investigate') return 'info';

  return 'success';
}

const ICONS: Record<EntryType, IconName> = {
  success: 'star',
  failure: 'skull',
  purchase: 'coin',
  info: 'eye',
};

// Splits the text so that numbers like "+64 gold" or "-1 life" can be bold.
// split() with a group keeps the matches: they are at the odd positions.
function parts(text: string): string[] {
  return text.split(/([+-]\d+ (?:gold|points|lives|life|levels?))/);
}
</script>

<template>
  <section class="chronicle panel" :class="{ compact }" aria-labelledby="log-title">
    <h2 id="log-title">Chronicle</h2>
    <p v-if="entries.length === 0" class="empty">Nothing happened yet.</p>
    <ul class="log" aria-live="polite">
      <li v-for="entry in recent" :key="entry.id" :class="entryType(entry)">
        <GameIcon :name="ICONS[entryType(entry)]" />
        <span v-if="entry.auto" class="auto-tag">Auto</span>
        <!-- One span for each part, so no extra spaces come between the parts. -->
        <span>
          <span
            v-for="(part, index) in parts(entry.text)"
            :key="index"
            :class="{ number: index % 2 === 1 }"
            >{{ part }}</span
          >
        </span>
      </li>
    </ul>
    <details v-if="older.length > 0" class="older">
      <summary>Older entries ({{ older.length }})</summary>
      <ul class="log older-list">
        <li v-for="entry in older" :key="entry.id" :class="entryType(entry)">
          <GameIcon :name="ICONS[entryType(entry)]" />
          <span v-if="entry.auto" class="auto-tag">Auto</span>
          <span>{{ entry.text }}</span>
        </li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
/* The newest entry is first. */
.log {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
}

.older {
  margin-top: var(--space-2);
  color: var(--color-muted);
  font-size: 0.85rem;
}

.older summary {
  cursor: pointer;
}

.older-list {
  max-height: 10rem;
  margin-top: var(--space-1);
  overflow-y: auto;
}

li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  list-style: none;
  padding: var(--space-1) var(--space-2);
  border-left: 3px solid var(--color-border);
  border-radius: 0 var(--radius-small) var(--radius-small) 0;
  background: rgb(0 0 0 / 20%);
  color: var(--color-text);
  font-size: 0.9rem;
}

/* The newest entry is larger, so the result of the last action is easy to see. */
.log:not(.older-list) li:first-child {
  padding: var(--space-2);
  font-size: 1rem;
  font-weight: 600;
}

li.success {
  border-left-color: var(--color-good);
  color: var(--color-good);
}

li.failure {
  border-left-color: var(--color-bad);
  color: var(--color-bad);
}

li.purchase {
  border-left-color: var(--color-gold);
  color: var(--color-gold);
}

/* Keeps the icon on the first line when the text wraps. */
li .icon {
  margin-top: 0.2em;
}

li.info .icon {
  color: var(--color-muted);
}

/* A small tag for the actions of auto-play. */
.auto-tag {
  flex-shrink: 0;
  padding: 0 0.35rem;
  border: 1px solid var(--color-ember);
  border-radius: 999px;
  color: var(--color-ember);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* The numbers stand out: "+64 gold", "-1 life". */
.number {
  padding: 0 0.2rem;
  white-space: nowrap;
  border-radius: 4px;
  background: rgb(255 255 255 / 8%);
  font-weight: 800;
}

.empty {
  margin: 0;
  color: var(--color-muted);
  font-family: var(--font-story);
  font-style: italic;
}

/* On a phone, the compact chronicle shows only the newest entry, under the HUD. */
@media (max-width: 899px) {
  .compact {
    padding: var(--space-1);
  }

  .compact h2,
  .compact .older,
  .compact li:not(:first-child) {
    display: none;
  }
}
</style>
