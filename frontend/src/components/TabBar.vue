<script setup lang="ts">
// Accessible tabs (WAI-ARIA tabs pattern). Only the selected tab is in the Tab order.
// The arrow keys, Home and End move to another tab and select it.
interface Tab {
  id: string;
  label: string;
  // The id of the tab panel that this tab shows.
  panel: string;
}

const props = defineProps<{ tabs: Tab[]; modelValue: string; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [id: string] }>();

function onKeydown(event: KeyboardEvent) {
  const index = props.tabs.findIndex((tab) => tab.id === props.modelValue);
  const last = props.tabs.length - 1;
  const next = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowLeft: index === 0 ? last : index - 1,
    Home: 0,
    End: last,
  }[event.key];

  if (next === undefined) return;
  event.preventDefault();
  emit('update:modelValue', props.tabs[next]!.id);
  // Move the focus to the new tab.
  const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
    '[role="tab"]',
  );

  buttons[next]?.focus();
}
</script>

<template>
  <div class="tabbar" role="tablist" :aria-label="label" @keydown="onKeydown">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="tab.id === modelValue"
      :aria-controls="tab.panel"
      :tabindex="tab.id === modelValue ? 0 : -1"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.tabbar {
  display: flex;
  gap: var(--space-1);
}

button {
  flex: 1;
  min-height: 2.25rem;
  padding: 0.25rem 1rem;
}

/* .tabbar makes this rule stronger than the global hover rule of buttons. */
.tabbar button[aria-selected='true'] {
  border-color: var(--color-ember-dark);
  background: linear-gradient(180deg, var(--color-gold), var(--color-ember));
  color: var(--color-on-accent);
}
</style>
