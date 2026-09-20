<script setup lang="ts">
import { TOM_BADGE, type Tom } from "./ui.js";
withDefaults(defineProps<{ tom?: Tom; className?: string }>(), { tom: "neutro", className: "" });
</script>
<template>
  <span :class="`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TOM_BADGE[tom]} ${className}`"><slot /></span>
</template>
