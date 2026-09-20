<script setup lang="ts">
import { computed } from "vue";
import type { Tom } from "./ui.js";
const props = withDefaults(defineProps<{ valor: number; max: number; tom?: Tom }>(), { tom: "verde" });
const pct = computed(() => (props.max > 0 ? Math.min(100, Math.round((props.valor / props.max) * 100)) : 0));
const cores: Record<Tom, string> = {
  neutro: "bg-campo-400", verde: "bg-emerald-500", ambar: "bg-amber-500", vermelho: "bg-red-500",
  azul: "bg-sky-500", ouro: "bg-ouro-500", roxo: "bg-violet-500",
};
</script>
<template>
  <div class="h-2 w-full overflow-hidden rounded-full bg-campo-100">
    <div :class="`h-full rounded-full ${cores[tom]}`" :style="{ width: `${pct}%` }" />
  </div>
</template>
