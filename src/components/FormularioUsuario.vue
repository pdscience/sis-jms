<script setup lang="ts">
import { ref } from "vue";
import Campo from "./Campo.vue";
import Aviso from "./Aviso.vue";
import { classeBotaoPerigo, classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";
import { PAPEL_LABEL, type Papel } from "../lib/dominio.js";

const erro = ref("");
const sucesso = ref("");
const pendente = ref(false);
const chave = ref(0);
const papelSelecionado = ref<Papel>("secretaria");

async function onSubmit(e: Event) {
  erro.value = "";
  pendente.value = true;
  try {
    const r = await fetch("/api/usuarios", { method: "POST", body: new FormData(e.target as HTMLFormElement) });
    const j = await r.json();
    if (j.ok) sucesso.value = j.sucesso ?? "Criado.";
    else erro.value = j.erro ?? "Falha ao criar.";
  } catch { erro.value = "Falha de rede."; }
  finally { pendente.value = false; }
}
</script>

<template>
  <form :key="chave" class="space-y-4" @submit.prevent="onSubmit">
    <Aviso v-if="erro" tom="vermelho">{{ erro }}</Aviso>
    <Aviso v-if="sucesso" tom="verde">{{ sucesso }} <button type="button" class="font-semibold underline" @click="chave += 1; sucesso = ''">Cadastrar outro</button></Aviso>
    <div class="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome completo" obrigatorio><input name="nome" :class="classeInput" required /></Campo>
      <Campo rotulo="Login" obrigatorio><input name="login" :class="classeInput" placeholder="ex.: medico2" required /></Campo>
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <Campo rotulo="Senha inicial" obrigatorio dica="mínimo 4 caracteres"><input name="senha" type="text" :class="classeInput" required /></Campo>
      <Campo rotulo="Perfil (RBAC)" obrigatorio>
        <select name="papel" v-model="papelSelecionado" :class="classeInput">
          <option v-for="papel in (Object.keys(PAPEL_LABEL) as Papel[])" :key="papel" :value="papel">{{ PAPEL_LABEL[papel] }}</option>
        </select>
      </Campo>
      <Campo rotulo="Posto/Graduação"><input name="posto" :class="classeInput" placeholder="ex.: Capitão" /></Campo>
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <Campo rotulo="CRM"><input name="crm" :class="classeInput" placeholder="ex.: CRM-DF 00000" /></Campo>
      <Campo rotulo="Especialidade"><input name="especialidade" :class="classeInput" placeholder="ex.: Clínica Médica" /></Campo>
      <Campo rotulo="E-mail"><input name="email" type="email" :class="classeInput" /></Campo>
    </div>
    <Campo rotulo="OM de vinculação"><input name="om" :class="classeInput" placeholder="ex.: 1º Batalhão de Polícia Militar" /></Campo>
    <button type="submit" :disabled="pendente" :class="classeBotaoPrimario">{{ pendente ? "Criando..." : "Criar usuário" }}</button>
  </form>
</template>
