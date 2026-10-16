<script setup lang="ts">
import { computed, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { addDias, formatBR, formatDataHora } from "../lib/datas.js";
import {
  rotuloStatusBoletim, tomStatusBoletim,
  classeBotaoPrimario, classeBotaoSecundario, classeBotaoPerigo, classeInput, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ registroId: number }>();

const carregando = ref(true);
const erro = ref("");
const visao = ref<any>(null);
const papel = ref("");
const msg = ref("");
const acaoErro = ref("");
const ocupado = ref(false);
const secao2 = ref("");
const secao3 = ref("");
const secao4 = ref("");

const boletim = computed(() => visao.value?.boletim ?? null);
const publicado = computed(() => boletim.value?.status === "publicado");
const ehAdmin = computed(() => papel.value === "admin");
const numeroFmt = computed(() => boletim.value ? `BI nº ${String(boletim.value.numero).padStart(3, "0")}/${boletim.value.ano}` : "");
const semanaISO = computed(() => boletim.value ? String(boletim.value.semana).slice(0, 10) : "");

function paragrafos(texto: string): string[] {
  const t = (texto ?? "").trim();
  return t ? t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : ["Sem registro."];
}

async function carregar() {
  carregando.value = true; erro.value = "";
  try {
    const r = await fetch(`/api/boletins/${props.registroId}`);
    const j = await r.json();
    if (j.ok) {
      visao.value = j.dados;
      papel.value = j.dados.papel;
      secao2.value = j.dados.boletim.secao2 ?? "";
      secao3.value = j.dados.boletim.secao3 ?? "";
      secao4.value = j.dados.boletim.secao4 ?? "";
    } else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
}
carregar();

async function post(acao: string, body: unknown) {
  const r = await fetch(`/api/boletins?acao=${acao}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}

async function salvar() {
  acaoErro.value = ""; msg.value = ""; ocupado.value = true;
  try {
    const fd = new FormData();
    fd.set("id", String(props.registroId));
    fd.set("secao2", secao2.value); fd.set("secao3", secao3.value); fd.set("secao4", secao4.value);
    const r = await fetch("/api/boletins", { method: "POST", body: fd });
    const j = await r.json();
    if (j.ok) msg.value = j.sucesso ?? "Boletim salvo.";
    else acaoErro.value = j.erro ?? "Falha ao salvar.";
  } catch { acaoErro.value = "Falha de rede."; } finally { ocupado.value = false; }
}

async function publicar() {
  if (!confirm("Publicar o boletim? A escala será congelada e o documento ficará somente leitura.")) return;
  acaoErro.value = ""; msg.value = ""; ocupado.value = true;
  try {
    const j = await post("publicar", { id: props.registroId });
    if (j.ok) { msg.value = j.sucesso ?? "Boletim publicado."; await carregar(); }
    else acaoErro.value = j.erro ?? "Falha ao publicar.";
  } catch { acaoErro.value = "Falha de rede."; } finally { ocupado.value = false; }
}

async function excluir() {
  if (!confirm("Excluir este rascunho? A ação não pode ser desfeita.")) return;
  acaoErro.value = ""; msg.value = ""; ocupado.value = true;
  try {
    const j = await post("excluir", { id: props.registroId });
    if (j.ok) window.location.href = "/boletim";
    else acaoErro.value = j.erro ?? "Falha ao excluir.";
  } catch { acaoErro.value = "Falha de rede."; } finally { ocupado.value = false; }
}

function imprimir() { window.print(); }
</script>

<template>
  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando boletim…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/boletim" class="font-semibold underline">Voltar</a></Aviso>
  <template v-else-if="visao && boletim">
    <div class="sem-impressao">
      <CabecalhoPagina
        :titulo="numeroFmt"
        :descricao="`Semana de ${formatBR(semanaISO)} a ${formatBR(addDias(semanaISO, 6))}`"
        :migalhas="[{ rotulo: 'Boletim interno', href: '/boletim' }, { rotulo: numeroFmt }]"
      >
        <template #acoes>
          <button type="button" :class="classeBotaoSecundario" @click="imprimir"><Icone nome="impressora" className="h-4 w-4" /> Imprimir</button>
          <a :href="`/api/boletins/${registroId}/pdf`" target="_blank" rel="noreferrer" :class="classeBotaoPrimario"><Icone nome="download" className="h-4 w-4" /> Baixar PDF</a>
          <button v-if="!publicado" type="button" :disabled="ocupado" :class="classeBotaoSecundario" @click="salvar">Salvar</button>
          <button v-if="ehAdmin && !publicado" type="button" :disabled="ocupado" :class="classeBotaoPrimario" @click="publicar">Publicar</button>
          <button v-if="ehAdmin && !publicado" type="button" :disabled="ocupado" :class="classeBotaoPerigo" @click="excluir">Excluir</button>
        </template>
      </CabecalhoPagina>
    </div>

    <div class="sem-impressao space-y-3">
      <Aviso v-if="acaoErro" tom="vermelho">{{ acaoErro }}</Aviso>
      <Aviso v-if="msg" tom="verde">{{ msg }}</Aviso>
      <Aviso v-if="publicado" tom="azul">Boletim publicado: somente leitura. A Seção I reflete a escala congelada no ato da publicação.</Aviso>
    </div>

    <div class="mt-4 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <article class="area-impressao rounded-xl border border-campo-200 bg-white p-8 shadow-sm">
        <header class="border-b border-campo-200 pb-4 text-center">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-campo-600">Governo de Rondônia — Polícia Militar</p>
          <p class="mt-1 text-xs uppercase tracking-wide text-campo-500">Junta de Inspeção de Saúde — JIS</p>
          <h2 class="mt-4 font-[family-name:var(--font-documento)] text-2xl font-semibold text-campo-950">BOLETIM INTERNO</h2>
          <p class="mt-1 text-sm font-semibold text-campo-700">{{ numeroFmt }}</p>
          <p class="text-xs text-campo-500">Semana de {{ formatBR(semanaISO) }} a {{ formatBR(addDias(semanaISO, 6)) }} · {{ rotuloStatusBoletim(boletim.status) }}</p>
        </header>

        <section class="mt-6">
          <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">I – ESCALA DE SERVIÇO</h3>
          <div v-for="dia in visao.escala.dias" :key="dia.dia" class="mt-3">
            <template v-if="dia.setores.length > 0">
              <p class="text-sm font-semibold text-campo-900">{{ dia.rotulo }} — {{ formatBR(addDias(semanaISO, dia.dia)) }}</p>
              <table class="mt-1 w-full border-collapse text-sm">
                <thead><tr><th :class="classeTh">Setor</th><th :class="classeTh">Turno</th><th :class="classeTh">Pessoa</th><th :class="classeTh">Observação</th></tr></thead>
                <tbody>
                  <template v-for="setor in dia.setores" :key="`${dia.dia}-${setor.setor}`">
                    <tr v-for="item in setor.itens" :key="`${setor.setor}-${item.turno}-${item.pessoaNome}`">
                      <td :class="classeTd">{{ setor.setor }}</td>
                      <td :class="classeTd">{{ item.turno }}</td>
                      <td :class="classeTd">{{ item.pessoaNome }}</td>
                      <td :class="classeTd">{{ item.observacao ?? "—" }}</td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </template>
          </div>
          <p v-if="visao.escala.dias.every((d: any) => d.setores.length === 0)" class="mt-2 text-sm text-campo-500">Sem escala cadastrada para esta semana.</p>
        </section>

        <section class="mt-6 space-y-4">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">II – ORDENS DE SERVIÇO</h3>
            <p v-for="(p, i) in paragrafos(secao2)" :key="i" class="mt-1 font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ p }}</p>
          </div>
          <div>
            <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">III – ASSUNTOS ADMINISTRATIVOS</h3>
            <p v-for="(p, i) in paragrafos(secao3)" :key="i" class="mt-1 font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ p }}</p>
          </div>
          <div>
            <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">IV – COMUNICADOS</h3>
            <p v-for="(p, i) in paragrafos(secao4)" :key="i" class="mt-1 font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ p }}</p>
          </div>
        </section>
      </article>

      <div class="sem-impressao space-y-6">
        <Card titulo="Situação">
          <div class="flex flex-wrap items-center gap-2">
            <Badge :tom="tomStatusBoletim(boletim.status)">{{ rotuloStatusBoletim(boletim.status) }}</Badge>
          </div>
          <dl class="mt-4 grid gap-3 text-sm">
            <div><dt class="text-xs uppercase tracking-wide text-campo-500">Criado em</dt><dd class="text-campo-900">{{ formatDataHora(boletim.criadoEm) }}</dd></div>
            <div><dt class="text-xs uppercase tracking-wide text-campo-500">Publicado em</dt><dd class="text-campo-900">{{ boletim.publicadoEm ? formatDataHora(boletim.publicadoEm) : "não publicado" }}</dd></div>
          </dl>
        </Card>

        <Card v-if="!publicado" titulo="Editar seções II a IV" descricao="Separe parágrafos com uma linha em branco.">
          <div class="space-y-4">
            <label class="block"><span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">II – Ordens de Serviço</span>
              <textarea v-model="secao2" :class="classeInput" rows="3" /></label>
            <label class="block"><span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">III – Assuntos Administrativos</span>
              <textarea v-model="secao3" :class="classeInput" rows="3" /></label>
            <label class="block"><span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">IV – Comunicados</span>
              <textarea v-model="secao4" :class="classeInput" rows="3" /></label>
            <button type="button" :disabled="ocupado" :class="classeBotaoPrimario" @click="salvar">Salvar seções</button>
          </div>
        </Card>

        <Card titulo="Trilha de auditoria" :corpo="false">
          <ul class="divide-y divide-campo-100">
            <li v-for="evento in visao.eventos" :key="evento.id" class="px-5 py-3 text-sm">
              <p class="font-semibold text-campo-900">{{ evento.acao.replace(/_/g, " ") }}</p>
              <p class="text-campo-700">{{ evento.resumo }}</p>
              <p class="text-xs text-campo-500">{{ formatDataHora(evento.criadoEm) }} · {{ evento.usuarioNome }}</p>
            </li>
            <li v-if="visao.eventos.length === 0" class="px-5 py-4 text-sm text-campo-500">Sem eventos registrados.</li>
          </ul>
        </Card>
      </div>
    </div>
  </template>
</template>
