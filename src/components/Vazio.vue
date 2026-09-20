<script setup lang="ts">
defineProps<{ titulo: string; descricao?: string }>();
</script>
<template>
  <div class="rounded-lg border border-dashed border-campo-300 bg-campo-50/60 px-6 py-10 text-center">
    <p class="text-sm font-semibold text-campo-800">{{ titulo }}</p>
    <p v-if="descricao" class="mx-auto mt-1 max-w-md text-sm text-campo-600">{{ descricao }}</p>
    <div v-if="$slots.default" class="mt-4 flex justify-center"><slot /></div>
  </div>
</template>
