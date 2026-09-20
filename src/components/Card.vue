<script setup lang="ts">
withDefaults(defineProps<{ titulo?: string; descricao?: string; corpo?: boolean; className?: string }>(), { corpo: true, className: "" });
</script>
<template>
  <section :class="`rounded-xl border border-campo-200/80 bg-white shadow-[0_1px_2px_rgba(20,52,43,0.06)] ${className}`">
    <header v-if="titulo || $slots.acao" class="flex flex-wrap items-start justify-between gap-3 border-b border-campo-100 px-5 py-4">
      <div>
        <h2 v-if="titulo" class="text-sm font-semibold uppercase tracking-[0.06em] text-campo-800">{{ titulo }}</h2>
        <p v-if="descricao" class="mt-1 text-sm text-campo-600">{{ descricao }}</p>
      </div>
      <slot name="acao" />
    </header>
    <div :class="corpo ? 'p-5' : ''"><slot /></div>
  </section>
</template>
