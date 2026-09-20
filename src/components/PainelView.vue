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
import { formatBR, formatDataHora } from "../lib/datas.js";
import { LIMITE_AGREGACAO_DIAS, PAPEL_LABEL, type Papel } from "../lib/dominio.js";
import {
  rotuloParecer, rotuloStatusAta, rotuloStatusAtestado,
  tomNivel, tomParecer, tomStatusAta, tomStatusAtestado,
  classeTd, classeTh,
} from "./ui.js";

type Painel = {
  usuario: { papel: string };
  kpis: Record<string, number>;
  alertas: any[];
  fila: any[];
  atasRecentes: any[];
  distribuicao: { parecer: string; rotulo: string; total: number }[];
  atividades: { id: number; acao: string; resumo: string; usuarioNome: string; quando: string }[];
};

const carregando = ref(true);
const erro = ref("");
const painel = ref<Painel | null>(null);

const papel = computed(() => painel.value?.usuario.papel ?? "");
const ehPessoal = computed(() => papel.value === "pessoal");
const ehMedico = computed(() => papel.value === "medico" || papel.value === "admin");
const rotuloPapel = computed(() => PAPEL_LABEL[papel.value as Papel] ?? papel.value);
const maxParecer = computed(() => Math.max(1, ...(painel.value?.distribuicao.map((d) => d.total) ?? [1])));

onMounted(async () => {
  try {
    const r = await fetch("/api/painel");
    const j = await r.json();
    if (j.ok) painel.value = j.dados;
    else erro.value = j.erro ?? "Falha ao carregar painel.";
  } catch {
    erro.value = "Falha de rede ao carregar painel.";
  } finally {
    carregando.value = false;
  }
});
</script>

<template>
  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando painel…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <template v-else-if="painel">
    <CabecalhoPagina
      titulo="Painel de controle da Junta Médica de Saúde"
      :descricao="`Visão consolidada de triagem, pareceres, prazos de afastamento e publicações em Boletim Geral. Perfil ativo: ${rotuloPapel}.`"
    >
      <template #acoes>
        <a v-if="!ehPessoal" href="/atestados?novo=1" class="inline-flex items-center gap-2 rounded-lg bg-campo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-campo-800">
          <Icone nome="documento" className="h-4 w-4" /> Receber atestado
        </a>
        <a v-if="ehMedico" href="/junta" class="inline-flex items-center gap-2 rounded-lg border border-campo-300 bg-white px-4 py-2 text-sm font-semibold text-campo-800 hover:bg-campo-50">
          <Icone nome="prancheta" className="h-4 w-4" /> Sala da Junta
        </a>
        <BotaoConvocacoes v-if="!ehPessoal" />
      </template>
    </CabecalhoPagina>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard rotulo="Policiais Militares vinculados" :valor="painel.kpis.totalMilitares" :detalhe="`${painel.kpis.agregados} agregado(s) · ${painel.kpis.afastados} afastado(s)`" tom="verde" href="/militares">
        <template #icone><Icone nome="usuario" /></template>
      </StatCard>
      <StatCard rotulo="Atestados na triagem" :valor="painel.kpis.atestadosPendentes" :detalhe="`${painel.kpis.atestadosEmAnalise} em análise pela Junta`" tom="ambar" :href="ehPessoal ? undefined : '/atestados'">
        <template #icone><Icone nome="documento" /></template>
      </StatCard>
      <StatCard rotulo="Alertas de prazo" :valor="painel.kpis.alertasCriticos" :detalhe="`${painel.kpis.convocacoesPendentes} convocação(ões) em aberto`" tom="vermelho" href="/prazos">
        <template #icone><Icone nome="alerta" /></template>
      </StatCard>
      <StatCard rotulo="Inspeções no mês" :valor="painel.kpis.inspecoesNoMes" :detalhe="`${painel.kpis.homologadosNoMes} atestado(s) homologado(s)`" tom="azul" href="/atas">
        <template #icone><Icone nome="lista" /></template>
      </StatCard>
    </div>

    <div v-if="painel.kpis.alertasCriticos > 0" class="mt-6">
      <Aviso tom="vermelho">
        <strong>{{ painel.kpis.alertasCriticos }}</strong> policial militar(es) estão em situação crítica de
        prazo (afastamento vencido ou encerrando em até 7 dias). Emita a convocação para
        reavaliação antes do término do período concedido.
      </Aviso>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Card titulo="Alertas de prazo e agregação" :descricao="`Acumulado em 12 meses · limite de agregação: ${LIMITE_AGREGACAO_DIAS} dias`" :corpo="false">
        <template #acao><a href="/prazos" class="text-sm font-semibold text-campo-700 hover:text-campo-900 hover:underline">Abrir painel completo</a></template>
        <div v-if="painel.alertas.length === 0" class="p-5"><Vazio titulo="Nenhum alerta ativo" descricao="Todos os afastamentos estão dentro dos prazos regulares." /></div>
        <div v-else class="rolagem-fina overflow-x-auto">
          <table class="min-w-full divide-y divide-campo-100 text-sm">
            <thead class="bg-campo-50/70">
              <tr><th :class="classeTh">Policial militar</th><th :class="classeTh">Acumulado</th><th :class="classeTh">Término</th><th :class="classeTh">Situação</th></tr>
            </thead>
            <tbody class="divide-y divide-campo-100">
              <tr v-for="alerta in painel.alertas" :key="alerta.militar.id" class="hover:bg-campo-50/60">
                <td :class="classeTd">
                  <a :href="`/militares/${alerta.militar.id}`" class="font-semibold text-campo-900 hover:underline">{{ alerta.militar.postoGraduacao }} {{ alerta.militar.nomeGuerra ?? alerta.militar.nome }}</a>
                  <p class="text-xs text-campo-500">RE {{ alerta.militar.re }} · {{ alerta.militar.om }}</p>
                </td>
                <td :class="classeTd">
                  <div class="w-32">
                    <p class="text-xs font-semibold tabular-nums text-campo-800">{{ alerta.diasAcumulados }} dias</p>
                    <Barra :valor="alerta.diasAcumulados" :max="120" :tom="tomNivel(alerta.nivel)" />
                  </div>
                </td>
                <td :class="`${classeTd} tabular-nums`">
                  <template v-if="alerta.dataFim">{{ formatBR(alerta.dataFim) }}<span class="block text-xs text-campo-500">{{ alerta.diasRestantes >= 0 ? `faltam ${alerta.diasRestantes} dia(s)` : `vencido há ${Math.abs(alerta.diasRestantes)} dia(s)` }}</span></template>
                  <span v-else class="text-campo-400">—</span>
                </td>
                <td :class="classeTd">
                  <div class="flex flex-wrap gap-1">
                    <Badge :tom="tomNivel(alerta.nivel)">{{ alerta.nivel }}</Badge>
                    <Badge v-if="alerta.agregado" tom="roxo">agregado</Badge>
                    <Badge v-if="alerta.convocacaoPendente" tom="azul">convocado</Badge>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div class="space-y-6">
        <Card v-if="!ehPessoal" titulo="Fila de triagem" descricao="Atestados aguardando conferência da Secretaria" :corpo="false">
          <template #acao><a href="/atestados" class="text-sm font-semibold text-campo-700 hover:underline">Ver fila</a></template>
          <div v-if="painel.fila.length === 0" class="p-5"><Vazio titulo="Fila zerada" descricao="Nenhum atestado pendente de triagem." /></div>
          <ul v-else class="divide-y divide-campo-100">
            <li v-for="item in painel.fila" :key="item.atestado.id" class="flex items-center justify-between gap-3 px-5 py-3">
              <div class="min-w-0">
                <a :href="`/atestados/${item.atestado.id}`" class="block truncate text-sm font-semibold text-campo-900 hover:underline">{{ item.militar.postoGraduacao }} {{ item.militar.nomeGuerra ?? item.militar.nome }}</a>
                <p class="truncate text-xs text-campo-500">{{ item.atestado.protocolo }} · {{ item.atestado.diasSugeridos }} dia(s) · {{ item.atestado.origem === "militar" ? "envio do policial militar" : "secretaria" }}</p>
              </div>
              <Badge :tom="tomStatusAtestado(item.atestado.status)">{{ rotuloStatusAtestado(item.atestado.status) }}</Badge>
            </li>
          </ul>
        </Card>

        <Card titulo="Distribuição de pareceres" descricao="Total de atas emitidas por conclusão da Junta">
          <ul class="space-y-3">
            <li v-for="d in painel.distribuicao.filter((x) => x.total > 0)" :key="d.parecer">
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="text-campo-800">{{ d.rotulo }}</span>
                <span class="tabular-nums font-semibold text-campo-900">{{ d.total }}</span>
              </div>
              <Barra :valor="d.total" :max="maxParecer" :tom="tomParecer(d.parecer)" />
            </li>
            <li v-if="painel.distribuicao.every((d) => d.total === 0)" class="text-sm text-campo-500">Nenhuma ata emitida ainda.</li>
          </ul>
        </Card>
      </div>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Card titulo="Últimas atas emitidas" :corpo="false">
        <template #acao><a href="/atas" class="text-sm font-semibold text-campo-700 hover:underline">Todas as atas</a></template>
        <div class="rolagem-fina overflow-x-auto">
          <table class="min-w-full divide-y divide-campo-100 text-sm">
            <thead class="bg-campo-50/70">
              <tr><th :class="classeTh">Ata</th><th :class="classeTh">Policial militar</th><th :class="classeTh">Parecer</th><th :class="classeTh">Período</th><th :class="classeTh">Situação</th></tr>
            </thead>
            <tbody class="divide-y divide-campo-100">
              <tr v-for="item in painel.atasRecentes" :key="item.ata.id" class="hover:bg-campo-50/60">
                <td :class="classeTd">
                  <a :href="`/atas/${item.ata.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ item.ata.ataNumero }}</a>
                  <p class="text-xs text-campo-500">{{ formatBR(item.ata.dataInspecao) }}</p>
                </td>
                <td :class="classeTd">
                  {{ item.militar.postoGraduacao }} {{ item.militar.nomeGuerra ?? item.militar.nome }}
                  <p class="text-xs text-campo-500">RE {{ item.militar.re }}</p>
                </td>
                <td :class="classeTd"><Badge :tom="tomParecer(item.ata.parecer)">{{ rotuloParecer(item.ata.parecer) }}</Badge></td>
                <td :class="`${classeTd} text-xs tabular-nums`">{{ item.ata.diasAfastamento > 0 ? `${item.ata.diasAfastamento}d · ${formatBR(item.ata.dataInicio)} a ${formatBR(item.ata.dataFim)}` : "sem afastamento" }}</td>
                <td :class="classeTd"><Badge :tom="tomStatusAta(item.ata.status)">{{ rotuloStatusAta(item.ata.status) }}</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card :titulo="ehPessoal ? 'Próximas reavaliações' : 'Movimentações recentes'" :descricao="ehPessoal ? 'Convocações em aberto para a Seção de Pessoal' : 'Trilha de auditoria (registro imutável)'">
        <ul v-if="ehPessoal" class="space-y-3 text-sm">
          <li v-for="a in painel.alertas.filter((x) => x.convocacaoPendente).slice(0, 6)" :key="a.militar.id" class="flex items-start justify-between gap-3">
            <div>
              <a :href="`/militares/${a.militar.id}`" class="font-semibold text-campo-900 hover:underline">{{ a.militar.postoGraduacao }} {{ a.militar.nomeGuerra ?? a.militar.nome }}</a>
              <p class="text-xs text-campo-500">{{ a.convocacaoPendente?.motivo }}</p>
            </div>
            <span class="shrink-0 text-xs tabular-nums text-campo-600">{{ formatBR(a.convocacaoPendente?.dataLimite) }}</span>
          </li>
          <li v-if="painel.alertas.filter((a) => a.convocacaoPendente).length === 0" class="text-campo-500">Nenhuma convocação em aberto.</li>
        </ul>
        <p v-else-if="painel.atividades.length === 0" class="text-sm text-campo-500">Sem movimentações registradas.</p>
        <ol v-else class="space-y-3 border-l border-campo-200 pl-4">
          <li v-for="atividade in painel.atividades" :key="atividade.id" class="relative text-sm">
            <span class="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-campo-400" />
            <p class="text-campo-800">{{ atividade.resumo }}</p>
            <p class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-campo-500">
              <Icone nome="calendario" className="h-3.5 w-3.5" />
              {{ formatDataHora(atividade.quando) }} · {{ atividade.usuarioNome }}
            </p>
          </li>
        </ol>
      </Card>
    </div>
  </template>
</template>
