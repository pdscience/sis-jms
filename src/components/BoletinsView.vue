<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { formatBR } from "../lib/datas.js";
import { rotuloStatusBoletim, tomStatusBoletim, classeBotaoPrimario, classeInput, classeTd, classeTh } from "./ui.js";

const props = defineProps<{ ano?: string; status?: string; busca?: string }>();
const anoAtual = computed(() => props.ano ?? "todos");
const statusAtual = computed(() => props.status ?? "todos");
const buscaAtual = computed(() => props.busca ?? "");

const carregando = ref(true);
const erro = ref("");
const boletins = ref<any[]>([]);

onMounted(async () => {
  try {
    const q = new URLSearchParams({ ano: anoAtual.value, status: statusAtual.value, busca: buscaAtual.value });
    const r = await fetch(`/api/boletins?${q}`);
    const j = await r.json();
    if (j.ok) boletins.value = j.dados.boletins;
    else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
});

const numeroFmt = (b: any) => `BI nº ${String(b.numero).padStart(3, "0")}/${b.ano}`;
const semanaISO = (b: any) => String(b.semana).slice(0, 10);
</script>

<template>
  <CabecalhoPagina
    titulo="Boletim interno"
    descricao="Documento oficial que publica a escala de serviço da semana e os assuntos administrativos da Junta."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Boletim interno' }]"
  >
    <template #acoes>
      <a :class="classeBotaoPrimario" href="/boletim/novo"><Icone nome="mais" className="h-4 w-4" /> Novo boletim</a>
    </template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando boletins…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <Card v-else :corpo="false">
    <form method="get" action="/boletim" class="flex flex-wrap items-end gap-3 border-b border-campo-100 p-4">
      <div class="min-w-[220px] flex-1">
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Busca</span>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-2.5 text-campo-400"><Icone nome="busca" /></span>
          <input name="busca" :value="buscaAtual" :class="`${classeInput} pl-9`" placeholder="Número, ano ou semana" />
        </div>
      </div>
      <div>
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Ano</span>
        <input name="ano" :value="anoAtual === 'todos' ? '' : anoAtual" :class="classeInput" placeholder="todos" inputmode="numeric" />
      </div>
      <div>
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Situação</span>
        <select name="status" :class="classeInput">
          <option value="todos" :selected="statusAtual === 'todos'">Todas</option>
          <option value="rascunho" :selected="statusAtual === 'rascunho'">Rascunho</option>
          <option value="publicado" :selected="statusAtual === 'publicado'">Publicado</option>
        </select>
      </div>
      <button type="submit" :class="classeBotaoPrimario">Filtrar</button>
    </form>

    <div v-if="boletins.length === 0" class="p-5"><Vazio titulo="Nenhum boletim localizado" descricao="Crie um boletim a partir da escala de uma semana." /></div>
    <div v-else class="rolagem-fina overflow-x-auto">
      <table class="min-w-full divide-y divide-campo-100 text-sm">
        <thead class="bg-campo-50/70"><tr><th :class="classeTh">Boletim</th><th :class="classeTh">Semana coberta</th><th :class="classeTh">Situação</th><th :class="classeTh">Criado em</th><th :class="classeTh">Documento</th></tr></thead>
        <tbody class="divide-y divide-campo-100">
          <tr v-for="b in boletins" :key="b.id" class="hover:bg-campo-50/60">
            <td :class="classeTd"><a :href="`/boletim/${b.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ numeroFmt(b) }}</a></td>
            <td :class="`${classeTd} text-xs`">início em {{ formatBR(semanaISO(b)) }}</td>
            <td :class="classeTd"><Badge :tom="tomStatusBoletim(b.status)">{{ rotuloStatusBoletim(b.status) }}</Badge></td>
            <td :class="`${classeTd} text-xs`">{{ formatBR(b.criadoEm) }}</td>
            <td :class="classeTd">
              <div class="flex gap-2">
                <a :href="`/boletim/${b.id}`" class="rounded-lg border border-campo-300 px-2.5 py-1 text-xs font-semibold text-campo-800 hover:bg-campo-50">Abrir</a>
                <a v-if="b.status === 'publicado'" :href="`/api/boletins/${b.id}/pdf`" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 rounded-lg border border-campo-300 px-2.5 py-1 text-xs font-semibold text-campo-800 hover:bg-campo-50"><Icone nome="download" className="h-3.5 w-3.5" /> PDF</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
