<script setup lang="ts">
import type { PropType } from 'vue';
import { ICON_PATHS, type IconName } from '../utils/icons';

// The icon is decoration only. The text next to it carries the meaning.
defineProps({ name: { type: String as PropType<IconName>, required: true } });
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path :d="ICON_PATHS[name]" fill="currentColor" fill-rule="evenodd" />
  </svg>
</template>

<style scoped>
.icon {
  width: 1.1em;
  height: 1.1em;
  flex-shrink: 0;
  vertical-align: -0.15em;
}
</style>
