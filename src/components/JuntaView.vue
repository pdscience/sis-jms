<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { formatBR } from "../lib/datas.js";
import { LIMITE_AGREGACAO_DIAS } from "../lib/dominio.js";
import {
  rotuloNivel, rotuloParecer, rotuloStatusAtestado,
  tomNivel, tomParecer, tomStatusAtestado,
  classeTd, classeTh,
} from "./ui.js";

const carregando = ref(true);
const erro = ref("");
const casos = ref<any[]>([]);
const criticos = computed(() => casos.value.filter((c) => c.resumo.nivel === "critico" || c.resumo.nivel === "vencido").length);

onMounted(async () => {
  try {
    const r = await fetch("/api/junta");
    const j = await r.json();
    if (j.ok) casos.value = j.dados.casos;
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
    titulo="Sala da Junta Médica de Saúde"
    descricao="Casos aguardando parecer oficial. Registre a conclusão, o período concedido e o enquadramento legal — a ata é gerada automaticamente."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Avaliação médica' }]"
  >
    <template #acoes>
      <a href="/junta/parecer" class="inline-flex items-center gap-2 rounded-lg bg-campo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-campo-800"><Icone nome="mais" /> Inspeção ex officio</a>
    </template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando pauta…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <template v-else>
    <div v-if="criticos > 0" class="mb-6">
      <Aviso tom="vermelho">{{ criticos }} caso(s) com prazo crítico: afastamento vencido ou encerrando nos próximos 7 dias. Priorize a reavaliação para evitar agregação indevida.</Aviso>
    </div>

    <Card titulo="Casos pendentes de parecer" :descricao="`${casos.length} atestado(s) na pauta · limite de agregação ${LIMITE_AGREGACAO_DIAS} dias`" :corpo="false">
      <div v-if="casos.length === 0" class="p-5">
        <Vazio titulo="Pauta zerada" descricao="Todos os atestados recebidos já possuem parecer da Junta.">
          <a href="/junta/parecer" class="inline-flex items-center gap-2 rounded-lg border border-campo-300 bg-white px-3 py-2 text-sm font-semibold text-campo-800"><Icone nome="prancheta" /> Registrar inspeção ex officio</a>
        </Vazio>
      </div>
      <div v-else class="rolagem-fina overflow-x-auto">
        <table class="min-w-full divide-y divide-campo-100 text-sm">
          <thead class="bg-campo-50/70"><tr><th :class="classeTh">Policial militar</th><th :class="classeTh">Atestado</th><th :class="classeTh">Prazo atual</th><th :class="classeTh">Histórico</th><th :class="classeTh">Ação</th></tr></thead>
          <tbody class="divide-y divide-campo-100">
            <tr v-for="caso in casos" :key="caso.atestado.id" class="hover:bg-campo-50/60">
              <td :class="classeTd">
                <a :href="`/militares/${caso.militar.id}`" class="font-semibold text-campo-900 hover:underline">{{ caso.militar.postoGraduacao }} {{ caso.militar.nomeGuerra ?? caso.militar.nome }}</a>
                <p class="text-xs text-campo-500">RE {{ caso.militar.re }} · {{ caso.militar.om }}</p>
                <div class="mt-1 flex flex-wrap gap-1">
                  <Badge :tom="tomNivel(caso.resumo.nivel)">{{ rotuloNivel(caso.resumo.nivel) }}</Badge>
                  <Badge v-if="caso.resumo.agregado" tom="roxo">agregado</Badge>
                </div>
              </td>
              <td :class="classeTd">
                <a :href="`/atestados/${caso.atestado.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ caso.atestado.protocolo }}</a>
                <p class="text-xs text-campo-500">{{ caso.atestado.diasSugeridos ?? 0 }} dia(s) · {{ formatBR(caso.atestado.dataEmissao) }}</p>
                <p class="text-xs text-campo-500">{{ caso.atestado.emitente }}</p>
                <p class="mt-1"><Badge :tom="tomStatusAtestado(caso.atestado.status)">{{ rotuloStatusAtestado(caso.atestado.status) }}</Badge></p>
              </td>
              <td :class="`${classeTd} text-xs tabular-nums`">
                {{ caso.resumo.diasAcumulados }} dia(s) acumulados
                <span class="block text-campo-500">{{ caso.resumo.dataFim ? `término ${formatBR(caso.resumo.dataFim)}` : "sem afastamento vigente" }}</span>
                <span v-if="caso.atestado.cid" class="block text-campo-500">CID {{ caso.atestado.cid }}</span>
              </td>
              <td :class="`${classeTd} text-xs`">
                <span v-if="caso.historico.length === 0" class="text-campo-400">primeira inspeção</span>
                <span v-for="ata in caso.historico" :key="ata.id" class="block">
                  <a :href="`/atas/${ata.id}`" class="text-campo-700 hover:underline">{{ formatBR(ata.dataInspecao) }}</a>
                  <Badge :tom="tomParecer(ata.parecer)">{{ rotuloParecer(ata.parecer) }}</Badge>
                </span>
              </td>
              <td :class="classeTd">
                <a :href="`/junta/parecer?atestadoId=${caso.atestado.id}`" class="inline-flex items-center gap-1 rounded-lg bg-campo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-campo-800"><Icone nome="prancheta" className="h-3.5 w-3.5" /> Emitir parecer</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </template>
</template>
