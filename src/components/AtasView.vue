<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { formatBR } from "../lib/datas.js";
import { PARECER_LABEL, STATUS_INSPECAO_LABEL } from "../lib/dominio.js";
import {
  rotuloParecer, rotuloStatusAta, tomParecer, tomStatusAta,
  classeBotaoPrimario, classeInput, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ busca?: string; parecer?: string; status?: string }>();
const buscaAtual = computed(() => props.busca ?? "");
const parecerAtual = computed(() => props.parecer ?? "todos");
const statusAtual = computed(() => props.status ?? "todos");

const carregando = ref(true);
const erro = ref("");
const atas = ref<any[]>([]);
const ehPessoal = ref(false);

onMounted(async () => {
  try {
    const q = new URLSearchParams({ busca: buscaAtual.value, parecer: parecerAtual.value, status: statusAtual.value });
    const r = await fetch(`/api/atas?${q}`);
    const j = await r.json();
    if (j.ok) { atas.value = j.dados.atas; ehPessoal.value = j.dados.papel === "pessoal"; }
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
    titulo="Atas e laudos de inspeção de saúde"
    :descricao="ehPessoal ? 'Atas homologadas/publicadas com o resultado administrativo. Dados clínicos permanecem restritos à Junta.' : 'Documento oficial gerado automaticamente, pronto para juntada ao processo e publicação do extrato em Boletim Geral.'"
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Atas e laudos' }]"
  />

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando atas…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <Card v-else :corpo="false">
    <form method="get" action="/atas" class="flex flex-wrap items-end gap-3 border-b border-campo-100 p-4">
      <div class="min-w-[220px] flex-1">
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Busca</span>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-2.5 text-campo-400"><Icone nome="busca" /></span>
          <input name="busca" :value="buscaAtual" :class="`${classeInput} pl-9`" placeholder="Número da ata, policial militar ou RE" />
        </div>
      </div>
      <div>
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Parecer</span>
        <select name="parecer" :class="classeInput">
          <option value="todos" :selected="parecerAtual === 'todos'">Todos</option>
          <option v-for="(rotulo, valor) in PARECER_LABEL" :key="valor" :value="valor" :selected="parecerAtual === valor">{{ rotulo }}</option>
        </select>
      </div>
      <div>
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Situação</span>
        <select name="status" :class="classeInput">
          <option value="todos" :selected="statusAtual === 'todos'">Todas</option>
          <option v-for="(rotulo, valor) in STATUS_INSPECAO_LABEL" :key="valor" :value="valor" :selected="statusAtual === valor">{{ rotulo }}</option>
        </select>
      </div>
      <button type="submit" :class="classeBotaoPrimario">Filtrar</button>
    </form>

    <div v-if="atas.length === 0" class="p-5"><Vazio titulo="Nenhuma ata localizada" descricao="As atas aparecem aqui assim que um parecer é registrado pela Junta." /></div>
    <div v-else class="rolagem-fina overflow-x-auto">
      <table class="min-w-full divide-y divide-campo-100 text-sm">
        <thead class="bg-campo-50/70"><tr><th :class="classeTh">Ata</th><th :class="classeTh">Policial militar</th><th :class="classeTh">Parecer</th><th :class="classeTh">Período concedido</th><th :class="classeTh">Médico</th><th :class="classeTh">Situação</th><th :class="classeTh">Documento</th></tr></thead>
        <tbody class="divide-y divide-campo-100">
          <tr v-for="item in atas" :key="item.ata.id" class="hover:bg-campo-50/60">
            <td :class="classeTd"><a :href="`/atas/${item.ata.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ item.ata.ataNumero }}</a><p class="text-xs text-campo-500">{{ formatBR(item.ata.dataInspecao) }}</p></td>
            <td :class="classeTd"><a :href="`/militares/${item.militar.id}`" class="font-semibold text-campo-900 hover:underline">{{ item.militar.postoGraduacao }} {{ item.militar.nomeGuerra ?? item.militar.nome }}</a><p class="text-xs text-campo-500">RE {{ item.militar.re }} · {{ item.militar.om }}</p></td>
            <td :class="classeTd"><Badge :tom="tomParecer(item.ata.parecer)">{{ rotuloParecer(item.ata.parecer) }}</Badge></td>
            <td :class="`${classeTd} text-xs tabular-nums`">{{ item.ata.diasAfastamento > 0 ? `${item.ata.diasAfastamento} dia(s) · ${formatBR(item.ata.dataInicio)} a ${formatBR(item.ata.dataFim)}` : "sem afastamento" }}</td>
            <td :class="`${classeTd} text-xs`">{{ item.medico?.nome ?? "—" }}</td>
            <td :class="classeTd"><Badge :tom="tomStatusAta(item.ata.status)">{{ rotuloStatusAta(item.ata.status) }}</Badge><span v-if="item.ata.biNumero" class="mt-1 block text-xs text-campo-500">{{ item.ata.biNumero }}</span></td>
            <td :class="classeTd">
              <div class="flex gap-2">
                <a :href="`/atas/${item.ata.id}`" class="rounded-lg border border-campo-300 px-2.5 py-1 text-xs font-semibold text-campo-800 hover:bg-campo-50">Abrir</a>
                <a :href="`/api/atas/${item.ata.id}/pdf`" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 rounded-lg border border-campo-300 px-2.5 py-1 text-xs font-semibold text-campo-800 hover:bg-campo-50"><Icone nome="download" className="h-3.5 w-3.5" /> PDF</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
