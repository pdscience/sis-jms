<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Barra from "./Barra.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { formatBR } from "../lib/datas.js";
import { SITUACAO_MILITAR_LABEL } from "../lib/dominio.js";
import {
  rotuloNivel, rotuloParecer, tomNivel, tomParecer,
  classeBotaoPrimario, classeInput, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ busca?: string; situacao?: string }>();

type Linha = { militar: any; resumo: any; totalInspecoes: number; totalAtestados: number };

const carregando = ref(true);
const erro = ref("");
const linhas = ref<Linha[]>([]);
const papel = ref("");

const podeCadastrar = computed(() => ["admin", "secretaria", "medico"].includes(papel.value));
const temFiltro = computed(() => (props.busca ?? "") !== "" || (!!props.situacao && props.situacao !== "todas"));

onMounted(async () => {
  try {
    const q = new URLSearchParams({ busca: props.busca ?? "", situacao: props.situacao ?? "todas" });
    const r = await fetch(`/api/militares?${q}`);
    const j = await r.json();
    if (j.ok) { linhas.value = j.dados.linhas; papel.value = j.dados.papel; }
    else erro.value = j.erro ?? "Falha ao listar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
});

const tomSituacao = (s: string) => (s === "agregado" ? "roxo" : s === "ativo" ? "verde" : "neutro") as "roxo" | "verde" | "neutro";
</script>

<template>
  <CabecalhoPagina
    titulo="Cadastro e perfil do policial militar"
    descricao="Dados funcionais centralizados com o histórico resumido de inspeções, atestados e afastamentos."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Policiais Militares' }]"
  >
    <template #acoes>
      <a v-if="podeCadastrar" href="/militares/novo" :class="classeBotaoPrimario"><Icone nome="mais" className="h-4 w-4" /> Novo cadastro</a>
    </template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando policiais militares…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <template v-else>
    <Card :corpo="false">
      <form method="get" action="/militares" class="flex flex-wrap items-end gap-3 border-b border-campo-100 p-4">
        <div class="min-w-[220px] flex-1">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Busca</span>
          <div class="relative">
            <span class="pointer-events-none absolute left-3 top-2.5 text-campo-400"><Icone nome="busca" /></span>
            <input name="busca" :value="busca ?? ''" :class="`${classeInput} pl-9`" placeholder="Nome, nome de guerra, RE ou CPF" />
          </div>
        </div>
        <div>
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Situação</span>
          <select name="situacao" :class="classeInput">
            <option value="todas" :selected="(situacao ?? 'todas') === 'todas'">Todas</option>
            <option v-for="(rotulo, valor) in SITUACAO_MILITAR_LABEL" :key="valor" :value="valor" :selected="(situacao ?? 'todas') === valor">{{ rotulo }}</option>
          </select>
        </div>
        <button type="submit" :class="classeBotaoPrimario">Filtrar</button>
        <a v-if="temFiltro" href="/militares" class="rounded-lg px-3 py-2 text-sm font-semibold text-campo-600 hover:text-campo-900">Limpar</a>
      </form>

      <div v-if="linhas.length === 0" class="p-5"><Vazio titulo="Nenhum policial militar encontrado" descricao="Ajuste a busca ou cadastre um novo policial militar para iniciar o fluxo." /></div>
      <div v-else class="rolagem-fina overflow-x-auto">
        <table class="min-w-full divide-y divide-campo-100 text-sm">
          <thead class="bg-campo-50/70">
            <tr><th :class="classeTh">Policial militar</th><th :class="classeTh">OM / Função</th><th :class="classeTh">Situação</th><th :class="classeTh">Último parecer</th><th :class="classeTh">Acumulado 12m</th><th :class="classeTh">Afastado até</th><th :class="classeTh">Registros</th></tr>
          </thead>
          <tbody class="divide-y divide-campo-100">
            <tr v-for="item in linhas" :key="item.militar.id" class="hover:bg-campo-50/60">
              <td :class="classeTd">
                <a :href="`/militares/${item.militar.id}`" class="font-semibold text-campo-900 hover:underline">{{ item.militar.postoGraduacao }} {{ item.militar.nomeGuerra ?? item.militar.nome }}</a>
                <p class="text-xs text-campo-500">{{ item.militar.nome }} · RE {{ item.militar.re }}</p>
              </td>
              <td :class="`${classeTd} text-xs`">{{ item.militar.om }}<span class="block text-campo-500">{{ item.militar.funcao ?? "—" }}</span></td>
              <td :class="classeTd"><Badge :tom="tomSituacao(item.militar.situacao)">{{ SITUACAO_MILITAR_LABEL[item.militar.situacao] ?? item.militar.situacao }}</Badge></td>
              <td :class="classeTd">
                <template v-if="item.resumo.ultimaInspecao">
                  <Badge :tom="tomParecer(item.resumo.ultimaInspecao.parecer)">{{ rotuloParecer(item.resumo.ultimaInspecao.parecer) }}</Badge>
                  <span class="mt-1 block text-xs text-campo-500">{{ formatBR(item.resumo.ultimaInspecao.dataInspecao) }}</span>
                </template>
                <span v-else class="text-xs text-campo-400">sem inspeção</span>
              </td>
              <td :class="classeTd">
                <div class="w-28">
                  <p class="text-xs font-semibold tabular-nums text-campo-800">{{ item.resumo.diasAcumulados }} dia(s)</p>
                  <Barra :valor="item.resumo.diasAcumulados" :max="120" :tom="tomNivel(item.resumo.nivel)" />
                  <span class="mt-1 block text-[11px] text-campo-500">{{ rotuloNivel(item.resumo.nivel) }}</span>
                </div>
              </td>
              <td :class="`${classeTd} text-xs tabular-nums`">
                <template v-if="item.resumo.dataFim">{{ formatBR(item.resumo.dataFim) }}<span class="block text-campo-500">{{ item.resumo.diasRestantes >= 0 ? `faltam ${item.resumo.diasRestantes} dia(s)` : `vencido há ${Math.abs(item.resumo.diasRestantes)} dia(s)` }}</span></template>
                <template v-else>—</template>
              </td>
              <td :class="`${classeTd} text-xs text-campo-600`">{{ item.totalInspecoes }} ata(s)<span class="block">{{ item.totalAtestados }} atestado(s)</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
    <p class="mt-3 text-xs text-campo-500">{{ linhas.length }} policial militar(es) listado(s). O acesso a dados clínicos é restrito aos membros da Junta; demais perfis visualizam apenas o resultado administrativo.</p>
  </template>
</template>
