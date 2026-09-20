<script setup lang="ts">
import type { Tom } from "./ui.js";
withDefaults(defineProps<{ tom?: Tom }>(), { tom: "azul" });
const cores: Record<Tom, string> = {
  neutro: "border-campo-200 bg-campo-50 text-campo-800", verde: "border-emerald-200 bg-emerald-50 text-emerald-800",
  ambar: "border-amber-200 bg-amber-50 text-amber-900", vermelho: "border-red-200 bg-red-50 text-red-800",
  azul: "border-sky-200 bg-sky-50 text-sky-900", ouro: "border-ouro-300 bg-ouro-100 text-ouro-700",
  roxo: "border-violet-200 bg-violet-50 text-violet-800",
};
</script>
<template>
  <div :class="`rounded-lg border px-4 py-3 text-sm ${cores[tom]}`"><slot /></div>
</template>
