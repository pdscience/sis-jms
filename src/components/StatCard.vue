<script setup lang="ts">
import type { Tom } from "./ui.js";
const props = withDefaults(defineProps<{ rotulo: string; valor: string | number; detalhe?: string; tom?: Tom; href?: string }>(), { tom: "neutro" });
const cores: Record<Tom, string> = {
  neutro: "text-campo-700 bg-campo-100", verde: "text-emerald-700 bg-emerald-50",
  ambar: "text-amber-700 bg-amber-50", vermelho: "text-red-700 bg-red-50",
  azul: "text-sky-700 bg-sky-50", ouro: "text-ouro-700 bg-ouro-100", roxo: "text-violet-700 bg-violet-50",
};
</script>
<template>
  <component :is="href ? 'a' : 'div'" :href="href" :class="href ? 'block rounded-xl border border-campo-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-campo-400 hover:shadow-md' : 'rounded-xl border border-campo-200/80 bg-white p-4'">
    <div class="flex items-center justify-between gap-2">
      <p class="text-[11px] font-semibold uppercase tracking-[0.09em] text-campo-500">{{ rotulo }}</p>
      <span v-if="$slots.icone" :class="`grid h-8 w-8 place-items-center rounded-lg ${cores[tom]}`"><slot name="icone" /></span>
    </div>
    <p class="mt-3 text-3xl font-semibold tabular-nums text-campo-900">{{ valor }}</p>
    <p v-if="detalhe" class="mt-1 text-xs text-campo-600">{{ detalhe }}</p>
  </component>
</template>
