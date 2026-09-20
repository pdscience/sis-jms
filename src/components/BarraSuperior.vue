<script setup lang="ts">
import { computed, ref } from "vue";
import Icone from "./Icone.vue";
import { PAPEL_LABEL, type Papel } from "../lib/dominio.js";
import { $densidadeTabela } from "../stores/junta.js";

const props = defineProps<{
  usuario: { nome: string; papel: string; posto: string | null };
  contadores?: { rotulo: string; valor: number }[];
}>();
const emit = defineEmits<{ (e: "abrir-menu"): void }>();

const saindo = ref(false);
const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const rotuloPapel = computed(() => PAPEL_LABEL[props.usuario.papel as Papel] ?? props.usuario.papel);

function alternarDensidade() {
  $densidadeTabela.set($densidadeTabela.get() === "compacta" ? "confortavel" : "compacta");
}

async function sair() {
  saindo.value = true;
  try {
    await fetch("/api/auth/sair", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-campo-200 bg-white/95 backdrop-blur">
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
      <div class="flex items-center gap-3">
        <button type="button" class="rounded-lg border border-campo-300 p-2 text-campo-700 hover:bg-campo-50 lg:hidden" aria-label="Abrir menu" @click="emit('abrir-menu')">
          <Icone nome="lista" className="h-5 w-5" />
        </button>
        <div>
          <p class="text-sm font-semibold text-campo-900">{{ usuario.posto ? `${usuario.posto} ` : "" }}{{ usuario.nome }}</p>
          <p class="text-xs text-campo-500">{{ rotuloPapel }} · {{ hoje }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span v-for="c in contadores ?? []" :key="c.rotulo" class="hidden items-center gap-1.5 rounded-lg border border-campo-200 bg-campo-50 px-2.5 py-1 text-xs font-medium text-campo-700 sm:inline-flex">
          <span class="font-semibold tabular-nums text-campo-900">{{ c.valor }}</span>{{ c.rotulo }}
        </span>
        <button type="button" class="hidden rounded-lg border border-campo-200 px-2.5 py-1 text-xs font-medium text-campo-600 hover:bg-campo-50 md:block" title="Alternar densidade das tabelas" @click="alternarDensidade">Densidade</button>
        <button type="button" :disabled="saindo" class="rounded-lg border border-campo-300 px-3 py-1.5 text-xs font-semibold text-campo-800 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-60" @click="sair">
          {{ saindo ? "Encerrando..." : "Encerrar sessão" }}
        </button>
      </div>
    </div>
  </header>
</template>
