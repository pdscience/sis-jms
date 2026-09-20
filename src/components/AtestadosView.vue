<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import FormularioAtestado from "./FormularioAtestado.vue";
import { formatBR } from "../lib/datas.js";
import {
  rotuloStatusAtestado, tomStatusAtestado,
  classeBotaoPrimario, classeInput, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ status?: string; busca?: string; novo?: string; militarIdInicial?: number | null }>();

const ABAS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "pendente", rotulo: "Pendentes" },
  { valor: "em_analise", rotulo: "Em análise" },
  { valor: "homologado", rotulo: "Homologados" },
  { valor: "nao_homologado", rotulo: "Não homologados" },
  { valor: "arquivado", rotulo: "Arquivados" },
];

const carregando = ref(true);
const erro = ref("");
const linhas = ref<any[]>([]);
const totais = ref<Record<string, number>>({});
const militares = ref<any[]>([]);
const papel = ref("");

const statusAtual = computed(() => props.status ?? "todos");
const buscaAtual = computed(() => props.busca ?? "");
const ehMedico = computed(() => papel.value === "medico" || papel.value === "admin");

const abaHref = (valor: string) =>
  valor === "todos"
    ? buscaAtual.value ? `/atestados?busca=${encodeURIComponent(buscaAtual.value)}` : "/atestados"
    : `/atestados?status=${valor}${buscaAtual.value ? `&busca=${encodeURIComponent(buscaAtual.value)}` : ""}`;

onMounted(async () => {
  try {
    const q = new URLSearchParams({ status: statusAtual.value, busca: buscaAtual.value });
    const r = await fetch(`/api/atestados?${q}`);
    const j = await r.json();
    if (j.ok) { linhas.value = j.dados.linhas; totais.value = j.dados.totais; militares.value = j.dados.militares; papel.value = j.dados.papel; }
    else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
});
</script>

<template>
  <CabecalhoPagina
    titulo="Gestão e recepção de atestados"
    descricao="Fila de triagem da Secretaria da Junta: envio digital do policial militar ou inserção rápida do documento físico digitalizado."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Atestados' }]"
  >
    <template #acoes><a href="/envio-atestado" :class="classeBotaoPrimario">Abrir portal do policial militar</a></template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando atestados…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <template v-else>
    <Card v-if="novo === '1'" titulo="Inserção rápida pela Secretaria" descricao="Anexe o documento e registre os dados do atestado apresentado." className="mb-6">
      <FormularioAtestado canal="secretaria" :militares="militares" :militar-id-inicial="militarIdInicial" />
    </Card>

    <Card :corpo="false">
      <div class="flex flex-wrap items-center gap-2 border-b border-campo-100 px-4 py-3">
        <a v-for="aba in ABAS" :key="aba.valor" :href="abaHref(aba.valor)" :class="`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${aba.valor === statusAtual ? 'bg-campo-800 text-white' : 'border border-campo-200 bg-white text-campo-700 hover:border-campo-400'}`">
          {{ aba.rotulo }}<span class="ml-1.5 tabular-nums opacity-70">{{ totais[aba.valor] ?? 0 }}</span>
        </a>
      </div>

      <form method="get" action="/atestados" class="flex flex-wrap items-end gap-3 border-b border-campo-100 p-4">
        <div class="min-w-[240px] flex-1">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Busca na fila</span>
          <div class="relative">
            <span class="pointer-events-none absolute left-3 top-2.5 text-campo-400"><Icone nome="busca" /></span>
            <input name="busca" :value="buscaAtual" :class="`${classeInput} pl-9`" placeholder="Protocolo, policial militar, RE, emitente ou CID" />
          </div>
        </div>
        <input v-if="statusAtual !== 'todos'" type="hidden" name="status" :value="statusAtual" />
        <button type="submit" :class="classeBotaoPrimario">Filtrar</button>
        <a v-if="buscaAtual" :href="statusAtual !== 'todos' ? `/atestados?status=${statusAtual}` : '/atestados'" class="rounded-lg px-3 py-2 text-sm font-semibold text-campo-600 hover:text-campo-900">Limpar</a>
      </form>

      <div v-if="linhas.length === 0" class="p-5"><Vazio titulo="Nenhum atestado neste filtro" descricao="Novos envios aparecem aqui automaticamente, com protocolo gerado." /></div>
      <div v-else class="rolagem-fina overflow-x-auto">
        <table class="min-w-full divide-y divide-campo-100 text-sm">
          <thead class="bg-campo-50/70">
            <tr><th :class="classeTh">Protocolo</th><th :class="classeTh">Policial militar</th><th :class="classeTh">Emissão</th><th :class="classeTh">Dias</th><th :class="classeTh">Origem</th><th :class="classeTh">Anexo</th><th :class="classeTh">Situação</th><th :class="classeTh">Ações</th></tr>
          </thead>
          <tbody class="divide-y divide-campo-100">
            <tr v-for="item in linhas" :key="item.atestado.id" class="hover:bg-campo-50/60">
              <td :class="classeTd"><a :href="`/atestados/${item.atestado.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ item.atestado.protocolo }}</a></td>
              <td :class="classeTd">
                <a :href="`/militares/${item.militar.id}`" class="font-semibold text-campo-900 hover:underline">{{ item.militar.postoGraduacao }} {{ item.militar.nomeGuerra ?? item.militar.nome }}</a>
                <p class="text-xs text-campo-500">RE {{ item.militar.re }} · {{ item.militar.om }}</p>
              </td>
              <td :class="`${classeTd} text-xs tabular-nums`">{{ formatBR(item.atestado.dataEmissao) }}<span class="block text-campo-500">apresentado {{ formatBR(item.atestado.dataApresentacao) }}</span></td>
              <td :class="`${classeTd} tabular-nums`">{{ item.atestado.diasSugeridos ?? 0 }}</td>
              <td :class="classeTd"><Badge :tom="item.atestado.origem === 'militar' ? 'azul' : 'neutro'">{{ item.atestado.origem === "militar" ? "envio do policial militar" : "secretaria" }}</Badge></td>
              <td :class="classeTd">
                <a v-if="item.atestado.arquivoBase64" :href="`/atestados/${item.atestado.id}`" class="inline-flex items-center gap-1 text-xs font-semibold text-campo-700 hover:underline"><Icone nome="anexo" />{{ (item.atestado.arquivoNome?.split(".").pop() ?? "anexo").toUpperCase() }}</a>
                <span v-else class="text-xs text-campo-400">não digitalizado</span>
              </td>
              <td :class="classeTd"><Badge :tom="tomStatusAtestado(item.atestado.status)">{{ rotuloStatusAtestado(item.atestado.status) }}</Badge></td>
              <td :class="classeTd">
                <div class="flex flex-wrap gap-2">
                  <a :href="`/atestados/${item.atestado.id}`" class="rounded-lg border border-campo-300 px-2.5 py-1 text-xs font-semibold text-campo-800 hover:bg-campo-50">Abrir</a>
                  <a v-if="ehMedico && item.atestado.status !== 'homologado'" :href="`/junta/parecer?atestadoId=${item.atestado.id}`" class="inline-flex items-center gap-1 rounded-lg bg-campo-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-campo-800"><Icone nome="prancheta" className="h-3.5 w-3.5" /> Emitir parecer</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </template>
</template>
