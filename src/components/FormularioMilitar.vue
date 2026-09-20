<script setup lang="ts">
import { ref } from "vue";
import Campo from "./Campo.vue";
import Aviso from "./Aviso.vue";
import { classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";
import { POSTOS_GRADUACOES, QUADROS, SITUACAO_MILITAR_LABEL } from "../lib/dominio.js";

export type DadosMilitar = {
  id?: number; re?: string | null; cpf?: string | null; nome?: string | null;
  nomeGuerra?: string | null; postoGraduacao?: string | null; quadro?: string | null;
  om?: string | null; funcao?: string | null; dataNascimento?: string | null;
  sexo?: string | null; tipoSanguineo?: string | null; telefone?: string | null;
  email?: string | null; dataInclusao?: string | null; situacao?: string | null;
  observacoes?: string | null;
};

const props = defineProps<{ inicial?: DadosMilitar }>();
const erro = ref("");
const sucesso = ref("");
const novoId = ref<number | null>(null);
const pendente = ref(false);

async function onSubmit(e: Event) {
  erro.value = ""; sucesso.value = ""; novoId.value = null;
  pendente.value = true;
  try {
    const r = await fetch("/api/militares/salvar", { method: "POST", body: new FormData(e.target as HTMLFormElement) });
    const j = await r.json();
    if (j.ok) { sucesso.value = j.sucesso ?? "Salvo."; novoId.value = j.id ?? null; if (!props.inicial?.id && j.id) window.location.href = `/militares/${j.id}`; }
    else erro.value = j.erro ?? "Falha ao salvar.";
  } catch { erro.value = "Falha de rede ao salvar."; }
  finally { pendente.value = false; }
}

const v = (x: string | null | undefined) => x ?? "";
</script>

<template>
  <form class="space-y-6" @submit.prevent="onSubmit">
    <input v-if="inicial?.id" type="hidden" name="id" :value="inicial.id" />
    <Aviso v-if="erro" tom="vermelho">{{ erro }}</Aviso>
    <Aviso v-if="sucesso" tom="verde">{{ sucesso }} <a v-if="novoId" :href="`/militares/${novoId}`" class="font-semibold underline">Abrir prontuário.</a></Aviso>

    <fieldset class="space-y-4">
      <legend class="text-xs font-semibold uppercase tracking-[0.09em] text-campo-500">Dados funcionais</legend>
      <div class="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="RE" obrigatorio><input name="re" :class="classeInput" :value="v(inicial?.re)" placeholder="ex.: 1045872" required /></Campo>
        <Campo rotulo="CPF"><input name="cpf" :class="classeInput" :value="v(inicial?.cpf)" placeholder="somente números" /></Campo>
        <Campo rotulo="Nome de guerra"><input name="nomeGuerra" :class="classeInput" :value="v(inicial?.nomeGuerra)" placeholder="ex.: ALMEIDA" /></Campo>
      </div>
      <Campo rotulo="Nome completo" obrigatorio><input name="nome" :class="classeInput" :value="v(inicial?.nome)" required /></Campo>
      <div class="grid gap-4 sm:grid-cols-4">
        <Campo rotulo="Posto/Graduação" obrigatorio>
          <select name="postoGraduacao" :class="classeInput" :value="v(inicial?.postoGraduacao)" required>
            <option value="">Selecione</option>
            <option v-for="p in POSTOS_GRADUACOES" :key="p" :value="p">{{ p }}</option>
          </select>
        </Campo>
        <Campo rotulo="Quadro">
          <select name="quadro" :class="classeInput" :value="v(inicial?.quadro)">
            <option value="">—</option>
            <option v-for="q in QUADROS" :key="q" :value="q">{{ q }}</option>
          </select>
        </Campo>
        <Campo rotulo="Função"><input name="funcao" :class="classeInput" :value="v(inicial?.funcao)" placeholder="ex.: motorista" /></Campo>
        <Campo rotulo="Situação administrativa">
          <select name="situacao" :class="classeInput" :value="v(inicial?.situacao) || 'ativo'">
            <option v-for="(rotulo, valor) in SITUACAO_MILITAR_LABEL" :key="valor" :value="valor">{{ rotulo }}</option>
          </select>
        </Campo>
      </div>
      <Campo rotulo="Organização Policial Militar (OPM)" obrigatorio><input name="om" :class="classeInput" :value="v(inicial?.om)" placeholder="ex.: 1º Batalhão de Polícia Militar" required /></Campo>
    </fieldset>

    <fieldset class="space-y-4">
      <legend class="text-xs font-semibold uppercase tracking-[0.09em] text-campo-500">Dados pessoais e contato</legend>
      <div class="grid gap-4 sm:grid-cols-4">
        <Campo rotulo="Data de nascimento"><input type="date" name="dataNascimento" :class="classeInput" :value="v(inicial?.dataNascimento)" /></Campo>
        <Campo rotulo="Sexo">
          <select name="sexo" :class="classeInput" :value="v(inicial?.sexo)">
            <option value="">—</option><option value="M">Masculino</option><option value="F">Feminino</option>
          </select>
        </Campo>
        <Campo rotulo="Tipo sanguíneo">
          <select name="tipoSanguineo" :class="classeInput" :value="v(inicial?.tipoSanguineo)">
            <option value="">—</option>
            <option v-for="t in ['A+','A-','B+','B-','AB+','AB-','O+','O-']" :key="t" :value="t">{{ t }}</option>
          </select>
        </Campo>
        <Campo rotulo="Data de inclusão"><input type="date" name="dataInclusao" :class="classeInput" :value="v(inicial?.dataInclusao)" /></Campo>
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Telefone"><input name="telefone" :class="classeInput" :value="v(inicial?.telefone)" placeholder="(00) 00000-0000" /></Campo>
        <Campo rotulo="E-mail"><input type="email" name="email" :class="classeInput" :value="v(inicial?.email)" /></Campo>
      </div>
      <Campo rotulo="Observações administrativas">
        <textarea name="observacoes" rows="3" :class="classeInput" :value="v(inicial?.observacoes)" placeholder="Informações não clínicas relevantes para a Junta (ex.: escala de serviço, movimentação prevista)." />
      </Campo>
    </fieldset>

    <div class="flex flex-wrap items-center gap-3">
      <button type="submit" :disabled="pendente" :class="classeBotaoPrimario">{{ pendente ? "Salvando..." : inicial?.id ? "Salvar alterações" : "Cadastrar policial militar" }}</button>
      <a href="/militares" :class="classeBotaoSecundario">Cancelar</a>
    </div>
  </form>
</template>
