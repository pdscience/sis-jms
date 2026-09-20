<script setup lang="ts">
defineProps<{ titulo: string; descricao?: string; migalhas?: { rotulo: string; href?: string }[] }>();
</script>
<template>
  <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <nav v-if="migalhas" class="mb-2 flex flex-wrap items-center gap-1 text-xs text-campo-500">
        <span v-for="(m, i) in migalhas" :key="`${m.rotulo}-${i}`" class="flex items-center gap-1">
          <span v-if="i > 0" aria-hidden>/</span>
          <a v-if="m.href" :href="m.href" class="hover:text-campo-800 hover:underline">{{ m.rotulo }}</a>
          <span v-else class="font-medium text-campo-700">{{ m.rotulo }}</span>
        </span>
      </nav>
      <h1 class="text-2xl font-semibold tracking-tight text-campo-900">{{ titulo }}</h1>
      <p v-if="descricao" class="mt-1 max-w-3xl text-sm text-campo-600">{{ descricao }}</p>
    </div>
    <div v-if="$slots.acoes" class="flex flex-wrap items-center gap-2"><slot name="acoes" /></div>
  </div>
</template>
