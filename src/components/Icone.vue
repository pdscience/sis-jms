<script setup lang="ts">
export type IconeNome =
  | "escudo" | "documento" | "prancheta" | "alerta" | "calendario" | "usuario"
  | "balanco" | "sair" | "busca" | "impressora" | "download" | "mais"
  | "check" | "x" | "relogio" | "lista" | "trilha" | "anexo";

withDefaults(defineProps<{ nome: IconeNome; className?: string }>(), {
  className: "h-4 w-4",
});

const J = 'stroke-linejoin="round"';
const C = 'stroke-linecap="round"';

const INNER: Record<IconeNome, string> = {
  escudo: `<path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6l7-3z" ${J}/><path d="M9 12l2 2 4-4" ${C} ${J}/>`,
  documento: `<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" ${J}/><path d="M14 3v5h5M9 13h6M9 17h4" ${C}/>`,
  prancheta: `<path d="M9 4h6v3H9zM8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2" ${J}/><path d="M8 12h8M8 16h5" ${C}/>`,
  alerta: `<path d="M12 4l9 16H3l9-16z" ${J}/><path d="M12 10v4M12 17.5v.5" ${C}/>`,
  calendario: `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4" ${C}/>`,
  usuario: `<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" ${C}/>`,
  balanco: `<path d="M12 4v16M7 20h10M4 9h16M4 9l-2 5h4l-2-5zM20 9l-2 5h4l-2-5z" ${J} ${C}/>`,
  sair: `<path d="M15 5V4a1 1 0 00-1-1H5a1 1 0 00-1 1v16a1 1 0 001 1h9a1 1 0 001-1v-1" ${J}/><path d="M10 12h11m0 0l-3-3m3 3l-3 3" ${C} ${J}/>`,
  busca: `<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5" ${C}/>`,
  impressora: `<path d="M7 9V4h10v5M7 19H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2" ${J}/><rect x="7" y="15" width="10" height="6" rx="1"/>`,
  download: `<path d="M12 4v11m0 0l4-4m-4 4l-4-4M5 19h14" ${C} ${J}/>`,
  mais: `<path d="M12 5v14M5 12h14" ${C}/>`,
  check: `<path d="M5 13l4 4L19 7" ${C} ${J}/>`,
  x: `<path d="M6 6l12 12M18 6L6 18" ${C}/>`,
  relogio: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" ${C} ${J}/>`,
  lista: `<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" ${C}/>`,
  trilha: `<path d="M4 20V8m0 0l4-4h8l4 4v12" ${J}/><path d="M8 12h8M8 16h5" ${C}/>`,
  anexo: `<path d="M20 11l-8 8a4.5 4.5 0 01-6.4-6.4l8.6-8.6a3 3 0 014.3 4.3L7.9 16.8a1.5 1.5 0 01-2.1-2.1l7.8-7.8" ${C} ${J}/>`,
};
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="nome === 'mais' ? 2 : nome === 'check' || nome === 'x' ? 1.8 : 1.7" :class="className" v-html="INNER[nome]" />
</template>
