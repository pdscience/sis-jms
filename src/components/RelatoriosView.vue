<script setup lang="ts">
import { onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import StatCard from "./StatCard.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { formatBR } from "../lib/datas.js";
import { PARECER_LABEL, SITUACAO_MILITAR_LABEL } from "../lib/dominio.js";
import { rotuloNivel, tomNivel, classeTd, classeTh } from "./ui.js";

const carregando = ref(true);
const erro = ref("");
const linhas = ref<any[]>([]);
const resumo = ref<Record<string, number> | null>(null);
const extratos = ref<string[]>([]);
const geradoPor = ref("");

onMounted(async () => {
  try {
    const r = await fetch("/api/relatorios");
    const j = await r.json();
    if (j.ok) {
      linhas.value = j.dados.linhas; resumo.value = j.dados.resumo;
      extratos.value = j.dados.extratos; geradoPor.value = j.dados.geradoPor;
    } else erro.value = j.erro ?? "Falha ao carregar.";
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
    titulo="Relatórios para a Seção de Pessoal (P1)"
    descricao="Consolidado administrativo de aptos, inaptos e agregados — sem dados clínicos, preservando o sigilo médico."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Relatórios' }]"
  >
    <template #acoes>
      <a href="/api/relatorios/pessoal" class="inline-flex items-center gap-2 rounded-lg bg-campo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-campo-800"><Icone nome="download" /> Exportar CSV</a>
    </template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Gerando relatório…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <template v-else-if="resumo">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard rotulo="Aptos / aptos com restrição" :valor="resumo.aptos" tom="verde"><template #icone><Icone nome="lista" /></template></StatCard>
      <StatCard rotulo="Inaptos temporários / LTS" :valor="resumo.inaptosTemporarios" tom="ambar" detalhe="afastamento em curso" />
      <StatCard rotulo="Inaptos definitivos" :valor="resumo.inaptosDefinitivos" tom="vermelho" detalhe="encaminhados para reforma" />
      <StatCard rotulo="Agregados" :valor="resumo.agregados" tom="roxo" detalhe="limite de 730 dias ultrapassado" />
      <StatCard rotulo="Sem inspeção registrada" :valor="resumo.semInspecao" tom="neutro" />
      <StatCard rotulo="Convocações em aberto" :valor="resumo.convocacoesAbertas" tom="azul" />
    </div>

    <Card titulo="Relação nominal para publicação" :descricao="`${linhas.length} policial militar(es) · gerado por ${geradoPor} em ${formatBR(new Date())}`" :corpo="false" className="mt-6">
      <div class="rolagem-fina overflow-x-auto">
        <table class="min-w-full divide-y divide-campo-100 text-sm">
          <thead class="bg-campo-50/70"><tr><th :class="classeTh">RE</th><th :class="classeTh">Policial militar</th><th :class="classeTh">OM</th><th :class="classeTh">Situação</th><th :class="classeTh">Último parecer</th><th :class="classeTh">Ata</th><th :class="classeTh">Acumulado</th><th :class="classeTh">Afastado até</th><th :class="classeTh">Convocação</th></tr></thead>
          <tbody class="divide-y divide-campo-100">
            <tr v-for="linha in linhas" :key="linha.re" class="hover:bg-campo-50/60">
              <td :class="`${classeTd} font-mono text-xs`">{{ linha.re }}</td>
              <td :class="classeTd">{{ linha.posto }} {{ linha.nomeGuerra }}<span class="block text-xs text-campo-500">{{ linha.nome }}</span></td>
              <td :class="`${classeTd} text-xs`">{{ linha.om }}</td>
              <td :class="classeTd"><Badge :tom="tomSituacao(linha.situacao)">{{ SITUACAO_MILITAR_LABEL[linha.situacao] ?? linha.situacao }}</Badge></td>
              <td :class="`${classeTd} text-xs`">{{ linha.ultimoParecer }}</td>
              <td :class="`${classeTd} font-mono text-[11px]`">{{ linha.ata }}</td>
              <td :class="`${classeTd} tabular-nums`">{{ linha.diasAcumulados }} dia(s)<span class="mt-1 block"><Badge :tom="tomNivel(linha.nivel)">{{ rotuloNivel(linha.nivel) }}</Badge></span></td>
              <td :class="`${classeTd} text-xs tabular-nums`">{{ linha.afastadoAte ? formatBR(linha.afastadoAte) : "—" }}</td>
              <td :class="`${classeTd} text-xs tabular-nums`">{{ linha.convocado ? formatBR(linha.convocado) : "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <Card titulo="Extrato consolidado para o Boletim Geral" descricao="Texto pronto para copiar e colar na parte de pessoal do BG" className="mt-6">
      <p v-if="extratos.length === 0" class="text-sm text-campo-500">Nenhuma ata publicada ainda. Publique o extrato de uma ata homologada para gerar o consolidado.</p>
      <pre v-else class="whitespace-pre-wrap rounded-lg bg-campo-50 p-4 font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ extratos.join("\n\n") }}</pre>
    </Card>
  </template>
</template>
