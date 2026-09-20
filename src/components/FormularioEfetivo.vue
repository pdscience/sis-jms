<script setup lang="ts">
import { ref } from "vue";
import Campo from "./Campo.vue";
import Aviso from "./Aviso.vue";
import { classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";

export type DadosEfetivo = {
  id?: number;
  militarId?: number | null;
  nome?: string | null;
  postoGraduacao?: string | null;
  funcao?: string | null;
  telefone?: string | null;
  ativo?: boolean;
};

const props = defineProps<{ inicial?: DadosEfetivo }>();
const emit = defineEmits<{ (e: "salvo"): void }>();

const erro = ref("");
const sucesso = ref("");
const novoId = ref<number | null>(null);
const pendente = ref(false);

const militarId = ref<number | null>(props.inicial?.militarId ?? null);
const nome = ref(props.inicial?.nome ?? "");
const posto = ref(props.inicial?.postoGraduacao ?? "");
const ativo = ref(props.inicial?.ativo ?? true);

const buscaMilitar = ref("");
const buscando = ref(false);
const resultados = ref<{ id: number; nome: string; postoGraduacao: string | null; re: string }[]>([]);

const v = (x: string | null | undefined) => x ?? "";

async function buscar() {
  erro.value = "";
  resultados.value = [];
  buscando.value = true;
  try {
    const q = new URLSearchParams({ busca: buscaMilitar.value.trim(), situacao: "todas" });
    const r = await fetch(`/api/militares?${q}`);
    const j = await r.json();
    if (j.ok) {
      resultados.value = (j.dados.linhas ?? []).map((l: any) => ({
        id: l.militar.id,
        nome: l.militar.nome,
        postoGraduacao: l.militar.postoGraduacao,
        re: l.militar.re,
      }));
      if (resultados.value.length === 0) erro.value = "Nenhum policial militar encontrado para o vínculo.";
    } else {
      erro.value = j.erro ?? "Falha ao buscar policial militar.";
    }
  } catch {
    erro.value = "Falha de rede ao buscar policial militar.";
  } finally {
    buscando.value = false;
  }
}

function vincular(id: number) {
  const m = resultados.value.find((r) => r.id === id);
  if (!m) return;
  militarId.value = m.id;
  nome.value = m.nome;
  posto.value = m.postoGraduacao ?? "";
}

function desvincular() {
  militarId.value = null;
}

async function onSubmit(e: Event) {
  erro.value = ""; sucesso.value = ""; novoId.value = null;
  pendente.value = true;
  try {
    const form = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/efetivo", { method: "POST", body: form });
    const j = await r.json();
    if (!j.ok) {
      erro.value = j.erro ?? "Falha ao salvar.";
      return;
    }
    const salvoId = j.id ?? props.inicial?.id ?? null;
    if (props.inicial?.id && salvoId && ativo.value !== (props.inicial.ativo ?? true)) {
      const rs = await fetch("/api/efetivo?acao=status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: salvoId, ativo: ativo.value }),
      });
      const js = await rs.json();
      if (!js.ok) {
        erro.value = js.erro ?? "Registro salvo, mas falha ao atualizar situação.";
        return;
      }
    }
    sucesso.value = j.sucesso ?? "Salvo.";
    novoId.value = salvoId;
    emit("salvo");
  } catch {
    erro.value = "Falha de rede ao salvar.";
  } finally {
    pendente.value = false;
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <input v-if="inicial?.id" type="hidden" name="id" :value="inicial.id" />
    <input type="hidden" name="militarId" :value="militarId ?? ''" />

    <Aviso v-if="erro" tom="vermelho">{{ erro }}</Aviso>
    <Aviso v-if="sucesso" tom="verde">{{ sucesso }}</Aviso>

    <fieldset class="space-y-3 rounded-lg border border-campo-200 bg-campo-50/50 p-4">
      <legend class="px-1 text-xs font-semibold uppercase tracking-[0.09em] text-campo-500">Vínculo com policial militar (opcional)</legend>
      <div class="flex flex-wrap items-end gap-2">
        <div class="min-w-[220px] flex-1">
          <Campo rotulo="Buscar militar por nome ou RE">
            <input v-model="buscaMilitar" :class="classeInput" placeholder="ex.: ALMEIDA ou 1045872" @keydown.enter.prevent="buscar" />
          </Campo>
        </div>
        <button type="button" :disabled="buscando" :class="classeBotaoSecundario" @click="buscar">{{ buscando ? "Buscando..." : "Buscar" }}</button>
      </div>
      <div v-if="resultados.length > 0" class="space-y-2">
        <Campo rotulo="Resultado — selecione para vincular">
          <select :class="classeInput" :value="militarId ?? ''" @change="vincular(Number(($event.target as HTMLSelectElement).value))">
            <option value="">Selecione…</option>
            <option v-for="m in resultados" :key="m.id" :value="m.id">{{ m.postoGraduacao }} {{ m.nome }} · RE {{ m.re }}</option>
          </select>
        </Campo>
      </div>
      <p v-if="militarId" class="flex flex-wrap items-center gap-2 text-sm text-campo-700">
        Vinculado ao militar #{{ militarId }} — nome e posto seguem o cadastro do militar.
        <button type="button" class="font-semibold text-red-700 underline" @click="desvincular">Desvincular</button>
      </p>
    </fieldset>

    <div class="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome completo" obrigatorio>
        <input name="nome" :class="classeInput" v-model="nome" :readonly="militarId !== null" placeholder="ex.: João Almeida da Silva" required />
      </Campo>
      <Campo rotulo="Posto/Graduação">
        <div v-if="militarId !== null" class="rounded-lg border border-campo-200 bg-campo-50 px-3 py-2 text-sm text-campo-900">
          {{ posto || "—" }}
        </div>
        <select v-else name="postoGraduacao" :class="classeInput" v-model="posto">
          <option value="">Selecione…</option>
          <option value="Soldado">Soldado</option>
          <option value="Cabo">Cabo</option>
          <option value="3º Sargento">3º Sargento</option>
          <option value="2º Sargento">2º Sargento</option>
          <option value="1º Sargento">1º Sargento</option>
          <option value="Subtenente">Subtenente</option>
          <option value="2º Tenente">2º Tenente</option>
          <option value="1º Tenente">1º Tenente</option>
          <option value="Capitão">Capitão</option>
          <option value="Major">Major</option>
          <option value="Tenente-Coronel">Tenente-Coronel</option>
          <option value="Coronel">Coronel</option>
          <option value="Funcionário Civil">Funcionário Civil</option>
          <option value="Médico">Médico</option>
          <option value="Técnico de Enfermagem">Técnico de Enfermagem</option>
          <option value="Enfermeiro">Enfermeiro</option>
        </select>
      </Campo>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Função no setor">
        <input name="funcao" :class="classeInput" :value="v(inicial?.funcao)" placeholder="ex.: auxiliar de plantão" />
      </Campo>
      <Campo rotulo="Telefone">
        <input name="telefone" :class="classeInput" :value="v(inicial?.telefone)" placeholder="(00) 00000-0000" />
      </Campo>
    </div>
    <label v-if="inicial?.id" class="flex items-center gap-2 text-sm text-campo-800">
      <input type="checkbox" v-model="ativo" class="h-4 w-4 accent-campo-700" /> Ativo no efetivo
    </label>

    <div class="flex flex-wrap items-center gap-3">
      <button type="submit" :disabled="pendente" :class="classeBotaoPrimario">{{ pendente ? "Salvando..." : inicial?.id ? "Salvar alterações" : "Incluir no efetivo" }}</button>
    </div>
  </form>
</template>
