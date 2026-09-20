<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import AcoesAta from "./AcoesAta.vue";
import { formatBR, formatDataHora } from "../lib/datas.js";
import { rotuloParecer, rotuloStatusAta, tomParecer, tomStatusAta } from "./ui.js";

const props = defineProps<{ registroId: number }>();

const carregando = ref(true);
const erro = ref("");
const visao = ref<any>(null);
const papel = ref("");

const biPadrao = computed(() => `BG nº ___, de ${formatBR(new Date())}`);

onMounted(async () => {
  try {
    const r = await fetch(`/api/atas/${props.registroId}`);
    const j = await r.json();
    if (j.ok) { visao.value = j.dados; papel.value = j.dados.papel; }
    else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
});
</script>

<template>
  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando ata…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/atas" class="font-semibold underline">Voltar</a></Aviso>
  <template v-else-if="visao">
    <div class="sem-impressao">
      <CabecalhoPagina
        :titulo="visao.ata.ataNumero"
        :descricao="`${visao.militar.postoGraduacao} ${visao.militar.nomeGuerra ?? visao.militar.nome} · inspeção de ${formatBR(visao.ata.dataInspecao)}`"
        :migalhas="[{ rotulo: 'Atas e laudos', href: '/atas' }, { rotulo: visao.ata.ataNumero }]"
      >
        <template #acoes>
          <AcoesAta :inspecao-id="visao.ata.id" :status="visao.ata.status" :papel="papel" :bi-padrao="biPadrao" />
        </template>
      </CabecalhoPagina>
    </div>

    <Aviso v-if="!visao.completa" tom="ouro">
      <div class="sem-impressao mb-6">
        Versão administrativa da ata: CID, anamnese e exames suprimidos. O conteúdo clínico completo é restrito aos membros da Junta Médica de Saúde.
      </div>
    </Aviso>

    <div class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <article class="area-impressao rounded-xl border border-campo-200 bg-white p-8 shadow-sm">
        <header class="border-b border-campo-200 pb-4 text-center">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-campo-600">Governo de Rondônia — Polícia Militar</p>
          <p class="mt-1 text-xs uppercase tracking-wide text-campo-500">{{ visao.militar.om }}</p>
          <h2 class="mt-4 font-[family-name:var(--font-documento)] text-2xl font-semibold text-campo-950">ATA DE INSPEÇÃO DE SAÚDE</h2>
          <p class="mt-1 text-sm font-semibold text-campo-700">{{ visao.ata.ataNumero }}</p>
        </header>

        <div class="mt-6 space-y-6">
          <section v-for="secao in visao.secoes" :key="secao.titulo">
            <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">{{ secao.titulo }}</h3>
            <div class="mt-2 space-y-2">
              <p v-for="(paragrafo, i) in secao.paragrafos" :key="i" class="font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ paragrafo }}</p>
            </div>
          </section>
        </div>

        <section class="mt-6 rounded-lg border border-campo-300 bg-campo-50 p-4">
          <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">Extrato para publicação em Boletim Geral</h3>
          <p class="mt-2 font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ visao.extratoBI }}</p>
        </section>

        <footer class="mt-10 grid gap-10 sm:grid-cols-2">
          <div class="text-center">
            <div class="mx-auto border-t border-campo-400 pt-2">
              <p class="text-sm font-semibold text-campo-900">{{ visao.medico?.nome ?? "Médico Avaliador" }}</p>
              <p class="text-xs text-campo-600">{{ visao.medico?.crm ?? "CRM __________" }}{{ visao.medico?.especialidade ? ` · ${visao.medico.especialidade}` : "" }}</p>
            </div>
          </div>
          <div class="text-center">
            <div class="mx-auto border-t border-campo-400 pt-2">
              <p class="text-sm font-semibold text-campo-900">{{ visao.homologador?.nome ?? "Presidente da JIS" }}</p>
              <p class="text-xs text-campo-600">{{ visao.homologador?.posto ?? "Homologação" }}</p>
            </div>
          </div>
        </footer>
      </article>

      <div class="sem-impressao space-y-6">
        <Card titulo="Situação administrativa">
          <div class="flex flex-wrap items-center gap-2">
            <Badge :tom="tomStatusAta(visao.ata.status)">{{ rotuloStatusAta(visao.ata.status) }}</Badge>
            <Badge :tom="tomParecer(visao.ata.parecer)">{{ rotuloParecer(visao.ata.parecer) }}</Badge>
            <Badge v-if="visao.ata.biNumero" tom="ouro">{{ visao.ata.biNumero }}</Badge>
          </div>
          <dl class="mt-4 grid gap-3 text-sm">
            <div><dt class="text-xs uppercase tracking-wide text-campo-500">Homologação</dt><dd class="text-campo-900">{{ visao.homologador ? `${visao.homologador.nome} — ${formatDataHora(visao.ata.homologadoEm)}` : "pendente" }}</dd></div>
            <div><dt class="text-xs uppercase tracking-wide text-campo-500">Publicação em BG</dt><dd class="text-campo-900">{{ visao.ata.publicadoEm ? formatDataHora(visao.ata.publicadoEm) : "não publicado" }}</dd></div>
            <div><dt class="text-xs uppercase tracking-wide text-campo-500">Reavaliação</dt><dd class="text-campo-900">{{ visao.ata.necessitaReavaliacao ? `prevista para ${formatBR(visao.ata.dataReavaliacao)}` : "não necessária" }}</dd></div>
          </dl>
          <div class="mt-4 flex flex-wrap gap-2">
            <a :href="`/militares/${visao.militar.id}`" class="rounded-lg border border-campo-300 px-3 py-1.5 text-xs font-semibold text-campo-800 hover:bg-campo-50">Prontuário do policial militar</a>
            <a v-if="visao.atestado" :href="`/atestados/${visao.atestado.id}`" class="rounded-lg border border-campo-300 px-3 py-1.5 text-xs font-semibold text-campo-800 hover:bg-campo-50">Atestado {{ visao.atestado.protocolo }}</a>
          </div>
        </Card>

        <Card titulo="Trilha de auditoria da ata" :corpo="false">
          <ul class="divide-y divide-campo-100">
            <li v-for="evento in visao.eventos" :key="evento.id" class="px-5 py-3 text-sm">
              <p class="font-semibold text-campo-900">{{ evento.acao.replace(/_/g, " ") }}</p>
              <p class="text-campo-700">{{ evento.resumo }}</p>
              <p class="text-xs text-campo-500">{{ formatDataHora(evento.criadoEm) }} · {{ evento.usuarioNome }}{{ evento.ip ? ` · IP ${evento.ip}` : "" }}</p>
            </li>
            <li v-if="visao.eventos.length === 0" class="px-5 py-4 text-sm text-campo-500">Sem eventos registrados.</li>
          </ul>
        </Card>
      </div>
    </div>
  </template>
</template>
