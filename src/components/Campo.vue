<script setup lang="ts">
withDefaults(defineProps<{ rotulo: string; dica?: string; obrigatorio?: boolean; className?: string }>(), { className: "" });
</script>
<template>
  <label :class="`block ${className}`">
    <span class="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-campo-700">{{ rotulo }}<span v-if="obrigatorio" class="text-red-600">*</span></span>
    <slot />
    <span v-if="dica" class="mt-1 block text-xs text-campo-500">{{ dica }}</span>
  </label>
</template>
