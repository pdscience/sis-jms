<script setup lang="ts">
import { ref } from "vue";
import Campo from "./Campo.vue";
import Aviso from "./Aviso.vue";
import { classeBotaoPrimario, classeInput } from "./ui.js";

export type OpcaoSetor = { id: number; nome: string };
export type OpcaoPessoa = { id: number; nome: string; postoGraduacao: string | null };

const TURNOS_FIXOS = ["manhã", "tarde", "integral", "plantão"] as const;
const DIAS_OPCOES = [
  { valor: 0, rotulo: "Segunda-feira" },
  { valor: 1, rotulo: "Terça-feira" },
  { valor: 2, rotulo: "Quarta-feira" },
  { valor: 3, rotulo: "Quinta-feira" },
  { valor: 4, rotulo: "Sexta-feira" },
  { valor: 5, rotulo: "Sábado" },
  { valor: 6, rotulo: "Domingo" },
];

const props = defineProps<{ semana: string; setores: OpcaoSetor[]; pessoas: OpcaoPessoa[]; diaInicial?: number }>();
const emit = defineEmits<{ (e: "salvo"): void }>();

const erro = ref("");
const sucesso = ref("");
const pendente = ref(false);

async function onSubmit(e: Event) {
  erro.value = ""; sucesso.value = "";
  pendente.value = true;
  try {
    const r = await fetch("/api/escalas", { method: "POST", body: new FormData(e.target as HTMLFormElement) });
    const j = await r.json();
    if (j.ok) {
      sucesso.value = j.sucesso ?? "Plantão adicionado.";
      emit("salvo");
    } else {
      erro.value = j.erro ?? "Falha ao adicionar plantão.";
    }
  } catch {
    erro.value = "Falha de rede ao adicionar plantão.";
  } finally {
    pendente.value = false;
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <input type="hidden" name="semana" :value="semana" />
    <Aviso v-if="erro" tom="vermelho">{{ erro }}</Aviso>
    <Aviso v-if="sucesso" tom="verde">{{ sucesso }}</Aviso>

    <div class="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Dia da semana" obrigatorio>
        <select name="dia" :class="classeInput" :value="diaInicial ?? 0" required>
          <option v-for="d in DIAS_OPCOES" :key="d.valor" :value="d.valor">{{ d.rotulo }}</option>
        </select>
      </Campo>
      <Campo rotulo="Turno" obrigatorio>
        <select name="turno" :class="classeInput" required>
          <option value="">Selecione</option>
          <option v-for="t in TURNOS_FIXOS" :key="t" :value="t">{{ t }}</option>
        </select>
      </Campo>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Setor" obrigatorio>
        <select name="setorId" :class="classeInput" required>
          <option value="">Selecione</option>
          <option v-for="s in setores" :key="s.id" :value="s.id">{{ s.nome }}</option>
        </select>
      </Campo>
      <Campo rotulo="Pessoa do efetivo" obrigatorio dica="Apenas registros ativos do efetivo.">
        <select name="efetivoId" :class="classeInput" required>
          <option value="">Selecione</option>
          <option v-for="p in pessoas" :key="p.id" :value="p.id">{{ p.postoGraduacao ? `${p.postoGraduacao} ` : "" }}{{ p.nome }}</option>
        </select>
      </Campo>
    </div>
    <Campo rotulo="Observação">
      <input name="observacao" :class="classeInput" placeholder="ex.: plantão de sobreaviso" />
    </Campo>

    <div class="flex flex-wrap items-center gap-3">
      <button type="submit" :disabled="pendente" :class="classeBotaoPrimario">{{ pendente ? "Adicionando..." : "Adicionar plantão" }}</button>
    </div>
  </form>
</template>
