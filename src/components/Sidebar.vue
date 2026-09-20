<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Icone from "./Icone.vue";
import { PAPEL_LABEL, type Papel } from "../lib/dominio.js";

export type UsuarioSessao = { id: number; nome: string; papel: string; posto: string | null; crm: string | null };

const props = defineProps<{ usuario: UsuarioSessao; aberto: boolean; caminho?: string }>();
const emit = defineEmits<{ (e: "fechar"): void }>();

type Item = { href: string; rotulo: string; icone: "escudo" | "usuario" | "documento" | "prancheta" | "calendario" | "lista" | "balanco" | "trilha" | "alerta"; papeis: Papel[]; grupo: string };

const ITENS: Item[] = [
  { href: "/painel", rotulo: "Painel de controle", icone: "escudo", papeis: ["admin", "medico", "secretaria", "pessoal"], grupo: "Visão geral" },
  { href: "/militares", rotulo: "Militares", icone: "usuario", papeis: ["admin", "medico", "secretaria", "pessoal"], grupo: "Visão geral" },
  { href: "/atestados", rotulo: "Recepção de atestados", icone: "documento", papeis: ["admin", "medico", "secretaria"], grupo: "Fluxo da Junta" },
  { href: "/junta", rotulo: "Avaliação médica", icone: "prancheta", papeis: ["admin", "medico"], grupo: "Fluxo da Junta" },
  { href: "/prazos", rotulo: "Prazos e agregados", icone: "calendario", papeis: ["admin", "medico", "secretaria", "pessoal"], grupo: "Fluxo da Junta" },
  { href: "/atas", rotulo: "Atas e laudos", icone: "lista", papeis: ["admin", "medico", "secretaria", "pessoal"], grupo: "Publicações" },
  { href: "/relatorios", rotulo: "Relatórios P1", icone: "balanco", papeis: ["admin", "medico", "secretaria", "pessoal"], grupo: "Publicações" },
  { href: "/auditoria", rotulo: "Trilha de auditoria", icone: "trilha", papeis: ["admin"], grupo: "Administração" },
  { href: "/usuarios", rotulo: "Usuários e perfis", icone: "usuario", papeis: ["admin"], grupo: "Administração" },
];

const montado = ref(false);
onMounted(() => { montado.value = true; });

const visiveis = computed(() => ITENS.filter((i) => (props.usuario.papel === "admin" ? true : i.papeis.includes(props.usuario.papel as Papel))));
const grupos = computed(() => Array.from(new Set(visiveis.value.map((i) => i.grupo))));
const caminhoAtual = computed(() => props.caminho ?? (typeof window !== "undefined" ? window.location.pathname : ""));
const ativo = (href: string) => caminhoAtual.value === href || caminhoAtual.value.startsWith(`${href}/`);
</script>

<template>
  <div v-if="aberto" class="fixed inset-0 z-30 bg-campo-950/50 lg:hidden" aria-hidden @click="emit('fechar')" />
  <aside :class="`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-campo-800 bg-campo-900 text-campo-100 transition-transform lg:translate-x-0 ${aberto ? 'translate-x-0' : '-translate-x-full'}`">
    <div class="flex items-start justify-between gap-2 border-b border-campo-800 px-5 py-5">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-ouro-300">SIS-JIS</p>
        <h1 class="mt-1 text-base font-semibold leading-tight text-white">Junta de Inspeção<br />de Saúde</h1>
      </div>
      <button type="button" class="rounded-md p-1 text-campo-200 hover:bg-campo-800 lg:hidden" aria-label="Fechar menu" @click="emit('fechar')">
        <Icone nome="x" className="h-5 w-5" />
      </button>
    </div>
    <nav class="rolagem-fina flex-1 overflow-y-auto px-3 py-4">
      <div v-for="grupo in grupos" :key="grupo" class="mb-5">
        <p class="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-campo-400">{{ grupo }}</p>
        <ul class="space-y-1">
          <li v-for="item in visiveis.filter((i) => i.grupo === grupo)" :key="item.href">
            <a :href="item.href" :class="`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${ativo(item.href) ? 'bg-campo-700 font-semibold text-white shadow-inner' : 'text-campo-200 hover:bg-campo-800 hover:text-white'}`" @click="emit('fechar')">
              <span :class="ativo(item.href) ? 'text-ouro-300' : 'text-campo-400'"><Icone :nome="item.icone" /></span>
              {{ item.rotulo }}
            </a>
          </li>
        </ul>
      </div>
      <div class="mb-2 rounded-lg border border-campo-800 bg-campo-800/50 px-3 py-3">
        <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-campo-400">Portal do policial militar</p>
        <a href="/envio-atestado" class="mt-1 block text-sm text-ouro-300 hover:underline" @click="emit('fechar')">Enviar atestado (sem login)</a>
      </div>
    </nav>
    <div class="border-t border-campo-800 px-5 py-4">
      <p class="truncate text-sm font-semibold text-white">{{ usuario.nome }}</p>
      <p class="mt-0.5 text-xs text-campo-300">{{ PAPEL_LABEL[usuario.papel as Papel] ?? usuario.papel }}</p>
      <p v-if="usuario.crm" class="text-xs text-campo-400">{{ usuario.crm }}</p>
      <p v-if="montado" class="mt-2 text-[10px] uppercase tracking-wider text-campo-500">Sessão local · dados de demonstração</p>
    </div>
  </aside>
</template>
