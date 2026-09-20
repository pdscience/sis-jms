<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Barra from "./Barra.vue";
import Card from "./Card.vue";
import StatCard from "./StatCard.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import BotaoConvocacoes from "./BotaoConvocacoes.vue";
import AcoesConvocacao from "./AcoesConvocacao.vue";
import { formatBR } from "../lib/datas.js";
import { FAIXAS_ALERTA, LIMITE_AGREGACAO_DIAS } from "../lib/dominio.js";
import {
  rotuloNivel, rotuloParecer, tomNivel, tomParecer,
  classeBotaoPrimario, classeInput, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ nivel?: string; busca?: string }>();
const nivelAtual = computed(() => props.nivel ?? "todos");
const buscaAtual = computed(() => props.busca ?? "");

const NIVEIS = [
  { valor: "todos", rotulo: "Todos com afastamento" },
  { valor: "vencido", rotulo: "Vencidos" },
  { valor: "critico", rotulo: "Críticos (90+ / vencendo)" },
  { valor: "atencao", rotulo: "Atenção (61-90 dias)" },
  { valor: "monitorar", rotulo: "Monitorar (31-60 dias)" },
];

const carregando = ref(true);
const erro = ref("");
const resumos = ref<any[]>([]);
const todos = ref<any[]>([]);
const convocacoesAbertas = ref<any[]>([]);
const mapaMilitares = ref<any[]>([]);
const papel = ref("");

const vencidos = computed(() => todos.value.filter((t) => t.nivel === "vencido" || t.diasRestantes < 0).length);
const criticos = computed(() => todos.value.filter((t) => t.nivel === "critico").length);
const atencao = computed(() => todos.value.filter((t) => t.nivel === "atencao").length);
const agregados = computed(() => todos.value.filter((t) => t.agregado).length);
const convocados = computed(() => todos.value.filter((t) => t.convocacaoPendente).length);
const proximosDaAgregacao = computed(() => todos.value.filter((t) => t.diasParaAgregacao <= 90 && !t.agregado).length);
const podeEditar = computed(() => ["admin", "secretaria", "medico"].includes(papel.value));
const ehMedico = computed(() => ["admin", "medico"].includes(papel.value));

const militarPorId = (id: number) => mapaMilitares.value.find((m) => m.id === id);
const nomeMilitar = (id: number) => {
  const m = militarPorId(id);
  return m ? `${m.postoGraduacao} ${m.nomeGuerra ?? m.nome}` : `Policial militar ${id}`;
};

const faixaTotal = (max: number) => todos.value.filter((t) => {  if (max === 30) return t.diasAcumulados > 0 && t.diasAcumulados <= 30;
  if (max === 60) return t.diasAcumulados > 30 && t.diasAcumulados <= 60;
  if (max === 90) return t.diasAcumulados > 60 && t.diasAcumulados <= 90;
  return t.diasAcumulados > 90;
}).length;

onMounted(async () => {
  try {
    const q = new URLSearchParams({ nivel: nivelAtual.value, busca: buscaAtual.value });
    const r = await fetch(`/api/prazos?${q}`);
    const j = await r.json();
    if (j.ok) {
      resumos.value = j.dados.resumos; todos.value = j.dados.todos;
      convocacoesAbertas.value = j.dados.convocacoesAbertas; mapaMilitares.value = j.dados.mapaMilitares;
      papel.value = j.dados.papel;
    } else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
});
</script>

<template>
  <CabecalhoPagina
    titulo="Acompanhamento de agregados e prazos"
    :descricao="`Painel automático de afastamentos: faixas de 30/60/90 dias, progressão para o limite de agregação (${LIMITE_AGREGACAO_DIAS} dias) e convocação para reavaliação.`"
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Prazos e agregados' }]"
  >
    <template #acoes><BotaoConvocacoes v-if="podeEditar" /></template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando prazos…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <template v-else>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard rotulo="Afastamentos vencidos" :valor="vencidos" tom="vermelho"><template #icone><Icone nome="alerta" /></template></StatCard>
      <StatCard rotulo="Situação crítica" :valor="criticos" detalhe="encerram em até 7 dias" tom="vermelho" />
      <StatCard rotulo="Faixa 61-90 dias" :valor="atencao" tom="ambar" />
      <StatCard rotulo="Agregados" :valor="agregados" :detalhe="`${proximosDaAgregacao} próximo(s) do limite`" tom="roxo"><template #icone><Icone nome="calendario" /></template></StatCard>
      <StatCard rotulo="Convocações abertas" :valor="convocados" tom="azul" />
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-4">
      <div v-for="faixa in FAIXAS_ALERTA" :key="faixa.chave" class="rounded-xl border border-campo-200 bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-campo-500">{{ faixa.rotulo }}</p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-campo-900">{{ faixaTotal(faixa.max) }}</p>
        <p class="text-xs text-campo-500">policial militar(es) na faixa</p>
      </div>
    </div>

    <Card :corpo="false" className="mt-6">
      <div class="flex flex-wrap items-center gap-2 border-b border-campo-100 px-4 py-3">
        <a v-for="item in NIVEIS" :key="item.valor" :href="item.valor === 'todos' ? (buscaAtual ? `/prazos?busca=${encodeURIComponent(buscaAtual)}` : '/prazos') : `/prazos?nivel=${item.valor}${buscaAtual ? `&busca=${encodeURIComponent(buscaAtual)}` : ''}`" :class="`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${item.valor === nivelAtual ? 'bg-campo-800 text-white' : 'border border-campo-200 bg-white text-campo-700 hover:border-campo-400'}`">{{ item.rotulo }}</a>
      </div>

      <form method="get" action="/prazos" class="flex flex-wrap items-end gap-3 border-b border-campo-100 p-4">
        <div class="min-w-[240px] flex-1">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Busca</span>
          <div class="relative">
            <span class="pointer-events-none absolute left-3 top-2.5 text-campo-400"><Icone nome="busca" /></span>
            <input name="busca" :value="buscaAtual" :class="`${classeInput} pl-9`" placeholder="Nome, RE ou OM" />
          </div>
        </div>
        <input v-if="nivelAtual !== 'todos'" type="hidden" name="nivel" :value="nivelAtual" />
        <button type="submit" :class="classeBotaoPrimario">Filtrar</button>
      </form>

      <div v-if="resumos.length === 0" class="p-5"><Vazio titulo="Nenhum policial militar nesta faixa" descricao="Ajuste o filtro de nível ou a busca." /></div>
      <div v-else class="rolagem-fina overflow-x-auto">
        <table class="min-w-full divide-y divide-campo-100 text-sm">
          <thead class="bg-campo-50/70"><tr><th :class="classeTh">Policial militar</th><th :class="classeTh">Acumulado / agregação</th><th :class="classeTh">Término</th><th :class="classeTh">Última ata</th><th :class="classeTh">Convocação</th><th :class="classeTh">Ações</th></tr></thead>
          <tbody class="divide-y divide-campo-100">
            <tr v-for="r in resumos" :key="r.militar.id" class="hover:bg-campo-50/60">
              <td :class="classeTd">
                <a :href="`/militares/${r.militar.id}`" class="font-semibold text-campo-900 hover:underline">{{ r.militar.postoGraduacao }} {{ r.militar.nomeGuerra ?? r.militar.nome }}</a>
                <p class="text-xs text-campo-500">RE {{ r.militar.re }} · {{ r.militar.om }}</p>
                <div class="mt-1 flex flex-wrap gap-1">
                  <Badge :tom="tomNivel(r.nivel)">{{ rotuloNivel(r.nivel) }}</Badge>
                  <Badge v-if="r.agregado" tom="roxo">agregado</Badge>
                  <Badge v-if="r.reavaliacaoNecessaria" tom="ambar">reavaliar</Badge>
                </div>
              </td>
              <td :class="classeTd">
                <div class="w-40">
                  <p class="text-xs font-semibold tabular-nums text-campo-800">{{ r.diasAcumulados }} / {{ LIMITE_AGREGACAO_DIAS }} dias</p>
                  <Barra :valor="r.diasAcumulados" :max="LIMITE_AGREGACAO_DIAS" :tom="r.diasAcumulados > LIMITE_AGREGACAO_DIAS * 0.8 ? 'vermelho' : tomNivel(r.nivel)" />
                  <span class="mt-1 block text-[11px] text-campo-500">{{ r.diasParaAgregacao > 0 ? `faltam ${r.diasParaAgregacao} dia(s) para agregação` : "limite de agregação excedido" }}</span>
                </div>
              </td>
              <td :class="`${classeTd} text-xs tabular-nums`">
                <template v-if="r.dataFim">{{ formatBR(r.dataFim) }}<span class="block text-campo-500">{{ r.diasRestantes >= 0 ? `faltam ${r.diasRestantes} dia(s)` : `vencido há ${Math.abs(r.diasRestantes)} dia(s)` }}</span></template>
                <template v-else>sem afastamento vigente</template>
              </td>
              <td :class="`${classeTd} text-xs`">
                <template v-if="r.ultimaInspecao">
                  <a :href="`/atas/${r.ultimaInspecao.id}`" class="font-mono font-semibold text-campo-800 hover:underline">{{ r.ultimaInspecao.ataNumero }}</a>
                  <span class="block text-campo-500">{{ formatBR(r.ultimaInspecao.dataInspecao) }}</span>
                  <Badge :tom="tomParecer(r.ultimaInspecao.parecer)">{{ rotuloParecer(r.ultimaInspecao.parecer) }}</Badge>
                </template>
                <span v-else class="text-campo-400">sem registro</span>
              </td>
              <td :class="`${classeTd} text-xs`">
                <template v-if="r.convocacaoPendente"><Badge tom="azul">limite {{ formatBR(r.convocacaoPendente.dataLimite) }}</Badge><span class="mt-1 block text-campo-500">{{ r.convocacaoPendente.status }}</span></template>
                <Badge v-else-if="r.reavaliacaoNecessaria" tom="ambar">convocação sugerida</Badge>
                <span v-else class="text-campo-400">—</span>
              </td>
              <td :class="classeTd">
                <div class="flex flex-wrap gap-2">
                  <a v-if="ehMedico" :href="`/junta/parecer?militarId=${r.militar.id}`" class="inline-flex items-center gap-1 rounded-lg bg-campo-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-campo-800"><Icone nome="prancheta" className="h-3.5 w-3.5" /> Inspecionar</a>
                  <a :href="`/militares/${r.militar.id}`" class="rounded-lg border border-campo-300 px-2.5 py-1 text-xs font-semibold text-campo-800 hover:bg-campo-50">Prontuário</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <Card titulo="Convocações em aberto" descricao="Emitidas manualmente ou pela varredura automática de prazos" className="mt-6" :corpo="false">
      <div v-if="convocacoesAbertas.length === 0" class="p-5"><Vazio titulo="Nenhuma convocação em aberto" /></div>
      <ul v-else class="divide-y divide-campo-100">
        <li v-for="c in convocacoesAbertas" :key="c.id" class="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div>
                    <a :href="`/militares/${c.militarId}`" class="text-sm font-semibold text-campo-900 hover:underline">{{ nomeMilitar(c.militarId) }}</a>
            <p class="text-sm text-campo-700">{{ c.motivo }}</p>
            <p class="text-xs text-campo-500">Emitida em {{ formatBR(c.emitidaEm) }} · limite {{ formatBR(c.dataLimite) }} · {{ c.canal }}</p>
          </div>
          <div class="flex items-center gap-3">
            <Badge :tom="c.status === 'notificada' ? 'azul' : 'ambar'">{{ c.status }}</Badge>
            <AcoesConvocacao v-if="podeEditar" :convocacao-id="c.id" :status="c.status" />
          </div>
        </li>
      </ul>
    </Card>
  </template>
</template>
