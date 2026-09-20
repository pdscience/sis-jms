<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useStore } from "@nanostores/vue";
import Campo from "./Campo.vue";
import Badge from "./Badge.vue";
import Aviso from "./Aviso.vue";
import Icone from "./Icone.vue";
import { classeBotaoPrimario, classeBotaoSecundario, classeInput, tomParecer } from "./ui.js";
import {
  CIDS_FREQUENTES, ENQUADRAMENTOS_LEGAIS, PARECER_LABEL, PARECER_RESUMO,
  RESTRICOES_PADRAO, TIPO_INSPECAO_LABEL, type Parecer,
} from "../lib/dominio.js";
import { $rascunhoParecer, definirCampoParecer, limparRascunhoParecer } from "../stores/junta.js";

export type MilitarResumido = { id: number; re: string; nome: string; nomeGuerra: string | null; postoGraduacao: string; om: string };
export type ContextoAtestado = { id: number; protocolo: string; emitente: string | null; dataEmissao: string; diasSugeridos: number | null; cid: string | null; descricao: string | null };

const props = defineProps<{
  militares: MilitarResumido[];
  militarSelecionado?: MilitarResumido | null;
  atestado?: ContextoAtestado | null;
  acumuladoAtual?: number;
  chaveContexto?: string;
}>();

const rascunhoPersistido = useStore($rascunhoParecer);
const valores = ref<Record<string, string>>({});
const erro = ref("");
const sucesso = ref("");
const novoId = ref<number | null>(null);
const pendente = ref(false);

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function somarDias(inicio: string, fim: string) {
  if (!inicio || !fim) return 0;
  const d1 = new Date(`${inicio}T00:00:00`);
  const d2 = new Date(`${fim}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
  const dias = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
  return dias > 0 ? dias : 0;
}

const padroes = computed<Record<string, string>>(() => ({
  militarId: String(props.militarSelecionado?.id ?? ""),
  atestadoId: props.atestado ? String(props.atestado.id) : "",
  tipo: props.atestado ? "inicial" : "ex_officio",
  dataInspecao: hojeISO(),
  parecer: "",
  cid: props.atestado?.cid ?? "",
  enquadramentoLegal: "",
  diasAfastamento: props.atestado?.diasSugeridos ? String(props.atestado.diasSugeridos) : "0",
  dataInicio: hojeISO(),
  dataFim: props.atestado?.diasSugeridos ? (() => { const d = new Date(); d.setDate(d.getDate() + props.atestado.diasSugeridos! - 1); return d.toISOString().slice(0, 10); })() : "",
  descricaoClinica: "",
  examesRealizados: "",
  recomendacoes: "",
  restricoes: "",
  dataReavaliacao: "",
}));

const valor = (campo: string) => valores.value[campo] ?? padroes.value[campo] ?? "";
function definir(campo: string, novo: string) {
  valores.value = { ...valores.value, [campo]: novo };
  definirCampoParecer(campo, novo);
}

onMounted(() => {
  const salvo = $rascunhoParecer.get();
  if (salvo._contexto === (props.chaveContexto ?? "livre") && Object.keys(salvo).length > 1) {
    valores.value = { ...salvo };
  } else {
    limparRascunhoParecer();
    definirCampoParecer("_contexto", props.chaveContexto ?? "livre");
  }
});

watch([() => valor("dataInicio"), () => valor("dataFim")], () => {
  const dias = somarDias(valor("dataInicio"), valor("dataFim"));
  if (dias > 0 && String(dias) !== valor("diasAfastamento")) definir("diasAfastamento", String(dias));
  if (valor("necessitaReavaliacao") === "on" && !valor("dataReavaliacao") && valor("dataFim")) {
    const d = new Date(`${valor("dataFim")}T00:00:00`);
    d.setDate(d.getDate() - 7);
    definir("dataReavaliacao", d.toISOString().slice(0, 10));
  }
});

const parecerAtual = computed(() => valor("parecer") as Parecer | "");
const diasInformados = computed(() => Number(valor("diasAfastamento") || 0));
const novoAcumulado = computed(() => (props.acumuladoAtual ?? 0) + diasInformados.value);
const exigePeriodo = computed(() => parecerAtual.value === "inapto_temporario" || parecerAtual.value === "necessita_lts" || parecerAtual.value === "agregacao");
const enquadramentoDica = computed(() => ENQUADRAMENTOS_LEGAIS.find((e) => e.valor === valor("enquadramentoLegal"))?.descricao ?? "Selecione o dispositivo aplicável");
const restricoesMarcadas = computed(() => valor("restricoes").split("|").filter(Boolean));

function alternarRestricao(restricao: string, marcada: boolean) {
  const lista = marcada ? [...restricoesMarcadas.value, restricao] : restricoesMarcadas.value.filter((r) => r !== restricao);
  definir("restricoes", lista.join("|"));
}

async function onSubmit(e: Event) {
  erro.value = "";
  pendente.value = true;
  try {
    const fd = new FormData(e.target as HTMLFormElement);
    fd.set("militarId", valor("militarId"));
    fd.set("atestadoId", valor("atestadoId"));
    fd.set("diasAfastamento", valor("diasAfastamento"));
    fd.set("restricoesLista", valor("restricoes"));
    const r = await fetch("/api/junta", { method: "POST", body: fd });
    const j = await r.json();
    if (j.ok) {
      sucesso.value = j.sucesso ?? "Registrado.";
      novoId.value = j.id ?? null;
      limparRascunhoParecer();
    } else erro.value = j.erro ?? "Falha ao registrar.";
  } catch { erro.value = "Falha de rede."; }
  finally { pendente.value = false; }
}

function limpar() { limparRascunhoParecer(); valores.value = {}; }
function fmtData(iso: string) { return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR"); }
</script>

<template>
  <div v-if="sucesso" class="space-y-4">
    <Aviso tom="verde"><span class="flex items-start gap-2"><Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0" /><span>{{ sucesso }}</span></span></Aviso>
    <div class="flex flex-wrap gap-2">
      <a v-if="novoId" :href="`/atas/${novoId}`" :class="classeBotaoPrimario">Abrir ata emitida</a>
      <a href="/junta" :class="classeBotaoSecundario">Voltar à fila da Junta</a>
      <button type="button" :class="classeBotaoSecundario" @click="limpar(); sucesso = ''">Limpar rascunho</button>
    </div>
  </div>

  <form v-else class="space-y-6" @submit.prevent="onSubmit">
    <Aviso v-if="erro" tom="vermelho">{{ erro }}</Aviso>

    <Aviso v-if="atestado" tom="azul">
      <strong>Atestado vinculado:</strong> {{ atestado.protocolo }} · emitido em {{ fmtData(atestado.dataEmissao) }} por {{ atestado.emitente ?? "não informado" }} · sugere {{ atestado.diasSugeridos ?? 0 }} dia(s).{{ atestado.descricao ? ` Relato: ${atestado.descricao}` : "" }}
    </Aviso>

    <fieldset class="space-y-4">
      <legend class="text-xs font-semibold uppercase tracking-[0.09em] text-campo-500">1. Identificação da inspeção</legend>
      <div class="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Policial militar inspecionado" obrigatorio>
          <div v-if="militarSelecionado" class="rounded-lg border border-campo-200 bg-campo-50 px-3 py-2 text-sm text-campo-900">
            {{ militarSelecionado.postoGraduacao }} {{ militarSelecionado.nomeGuerra ?? militarSelecionado.nome }}
            <span class="block text-xs text-campo-500">RE {{ militarSelecionado.re }} · {{ militarSelecionado.om }}</span>
          </div>
          <select v-else :class="classeInput" :value="valor('militarId')" required @change="definir('militarId', ($event.target as HTMLSelectElement).value)">
            <option value="">Selecione o policial militar</option>
            <option v-for="m in militares" :key="m.id" :value="m.id">{{ m.postoGraduacao }} {{ m.nomeGuerra ?? m.nome }} — RE {{ m.re }}</option>
          </select>
        </Campo>
        <Campo rotulo="Tipo de inspeção" obrigatorio>
          <select name="tipo" :class="classeInput" :value="valor('tipo')" @change="definir('tipo', ($event.target as HTMLSelectElement).value)">
            <option v-for="(r, v) in TIPO_INSPECAO_LABEL" :key="v" :value="v">{{ r }}</option>
          </select>
        </Campo>
        <Campo rotulo="Data da inspeção" obrigatorio>
          <input type="date" name="dataInspecao" :class="classeInput" :value="valor('dataInspecao')" required @change="definir('dataInspecao', ($event.target as HTMLInputElement).value)" />
        </Campo>
      </div>
    </fieldset>

    <fieldset class="space-y-3">
      <legend class="text-xs font-semibold uppercase tracking-[0.09em] text-campo-500">2. Parecer oficial da Junta</legend>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label v-for="opcao in (Object.keys(PARECER_LABEL) as Parecer[])" :key="opcao" :class="`cursor-pointer rounded-xl border p-3 transition ${parecerAtual === opcao ? 'border-campo-700 bg-campo-800 text-white shadow' : 'border-campo-200 bg-white hover:border-campo-400'}`">
          <input type="radio" name="parecer" :value="opcao" :checked="parecerAtual === opcao" class="sr-only" required @change="definir('parecer', opcao)" />
          <span class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold">{{ PARECER_LABEL[opcao] }}</span>
            <Icone v-if="parecerAtual === opcao" nome="check" className="h-4 w-4 text-ouro-300" />
          </span>
          <span :class="`mt-1 block text-xs leading-relaxed ${parecerAtual === opcao ? 'text-campo-200' : 'text-campo-500'}`">{{ PARECER_RESUMO[opcao] }}</span>
        </label>
      </div>
    </fieldset>

    <fieldset class="space-y-4">
      <legend class="text-xs font-semibold uppercase tracking-[0.09em] text-campo-500">3. Enquadramento legal e período concedido</legend>
      <div class="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="CID-10" dica="Dado sigiloso — visível apenas à equipe médica">
          <input name="cid" list="cids-parecer" :class="classeInput" :value="valor('cid')" placeholder="ex.: M54.5" @change="definir('cid', ($event.target as HTMLInputElement).value)" />
          <datalist id="cids-parecer"><option v-for="cid in CIDS_FREQUENTES" :key="cid" :value="cid" /></datalist>
        </Campo>
        <Campo rotulo="Enquadramento legal" :obrigatorio="exigePeriodo" :dica="enquadramentoDica">
          <select name="enquadramentoLegal" :class="classeInput" :value="valor('enquadramentoLegal')" :required="exigePeriodo" @change="definir('enquadramentoLegal', ($event.target as HTMLSelectElement).value)">
            <option value="">Selecione</option>
            <option v-for="e in ENQUADRAMENTOS_LEGAIS" :key="e.valor" :value="e.valor">{{ e.valor }}</option>
          </select>
        </Campo>
      </div>

      <div class="grid gap-4 sm:grid-cols-4">
        <Campo rotulo="Início do afastamento"><input type="date" name="dataInicio" :class="classeInput" :value="valor('dataInicio')" @change="definir('dataInicio', ($event.target as HTMLInputElement).value)" /></Campo>
        <Campo rotulo="Término do afastamento"><input type="date" name="dataFim" :class="classeInput" :value="valor('dataFim')" @change="definir('dataFim', ($event.target as HTMLInputElement).value)" /></Campo>
        <Campo rotulo="Dias concedidos">
          <div class="flex items-center gap-2">
            <input type="number" min="0" :class="classeInput" :value="valor('diasAfastamento')" readonly @change="definir('diasAfastamento', ($event.target as HTMLInputElement).value)" />
            <Badge :tom="diasInformados > 90 ? 'vermelho' : diasInformados > 0 ? 'ambar' : 'neutro'">{{ diasInformados }}d</Badge>
          </div>
        </Campo>
        <Campo rotulo="Reavaliação prevista"><input type="date" name="dataReavaliacao" :class="classeInput" :value="valor('dataReavaliacao')" @change="definir('dataReavaliacao', ($event.target as HTMLInputElement).value)" /></Campo>
      </div>

      <div class="rounded-xl border border-campo-200 bg-campo-50 p-4">
        <p class="text-sm text-campo-800">
          Acumulado atual em 12 meses: <strong class="tabular-nums">{{ acumuladoAtual ?? 0 }} dia(s)</strong>. Com este parecer o policial militar passa a <strong class="tabular-nums">{{ novoAcumulado }} dia(s)</strong>
          <Badge v-if="novoAcumulado >= 730" tom="roxo" className="ml-1">limite de agregação atingido</Badge>
        </p>
        <div class="mt-3 flex flex-wrap gap-4 text-sm text-campo-700">
          <label class="flex items-center gap-2"><input type="checkbox" name="restringeAtividade" :checked="valor('restringeAtividade') === 'on'" class="h-4 w-4 rounded border-campo-400 text-campo-700" @change="definir('restringeAtividade', ($event.target as HTMLInputElement).checked ? 'on' : '')" /> Impõe restrição de atividade</label>
          <label class="flex items-center gap-2"><input type="checkbox" name="necessitaReavaliacao" :checked="valor('necessitaReavaliacao') === 'on'" class="h-4 w-4 rounded border-campo-400 text-campo-700" @change="definir('necessitaReavaliacao', ($event.target as HTMLInputElement).checked ? 'on' : '')" /> Necessita de reavaliação (gera convocação automática)</label>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <label v-for="restricao in RESTRICOES_PADRAO" :key="restricao" class="flex items-start gap-2 text-sm text-campo-700">
            <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-campo-400 text-campo-700" :checked="restricoesMarcadas.includes(restricao)" @change="alternarRestricao(restricao, ($event.target as HTMLInputElement).checked)" />
            {{ restricao }}
          </label>
        </div>
      </div>
    </fieldset>

    <fieldset class="space-y-4">
      <legend class="text-xs font-semibold uppercase tracking-[0.09em] text-campo-500">4. Registro clínico (prontuário sigiloso)</legend>
      <Campo rotulo="Anamnese / evolução"><textarea name="descricaoClinica" rows="3" :class="classeInput" :value="valor('descricaoClinica')" placeholder="Achados do exame físico, evolução do quadro e conduta adotada." @change="definir('descricaoClinica', ($event.target as HTMLTextAreaElement).value)" /></Campo>
      <Campo rotulo="Exames complementares"><textarea name="examesRealizados" rows="2" :class="classeInput" :value="valor('examesRealizados')" placeholder="Exames apresentados e resultados relevantes." @change="definir('examesRealizados', ($event.target as HTMLTextAreaElement).value)" /></Campo>
      <Campo rotulo="Recomendações adicionais"><textarea name="recomendacoes" rows="2" :class="classeInput" :value="valor('recomendacoes')" placeholder="Condutas, medicações e orientações à OM." @change="definir('recomendacoes', ($event.target as HTMLTextAreaElement).value)" /></Campo>
    </fieldset>

    <div class="flex flex-wrap items-center gap-3 border-t border-campo-100 pt-4">
      <button type="submit" :disabled="pendente" :class="classeBotaoPrimario">{{ pendente ? "Registrando parecer..." : "Registrar parecer e gerar ata" }}</button>
      <button type="button" :class="classeBotaoSecundario" @click="limpar">Descartar rascunho</button>
      <span v-if="parecerAtual" class="text-xs text-campo-600">Parecer selecionado: <Badge :tom="tomParecer(parecerAtual)">{{ PARECER_LABEL[parecerAtual] }}</Badge></span>
      <span v-if="rascunhoPersistido && Object.keys(valores).length > 0" class="text-xs text-campo-400">rascunho salvo localmente</span>
    </div>
  </form>
</template>
