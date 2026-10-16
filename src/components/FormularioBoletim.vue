<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Campo from "./Campo.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import { classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";

const props = defineProps<{ semana: string }>();
const semana = ref(props.semana);
const erro = ref("");
const pendente = ref(false);
const confirmado = ref(false);
const existentes = ref<{ id: number; numero: number; ano: number; semana: string }[]>([]);

onMounted(async () => {
  try {
    const r = await fetch("/api/boletins");
    const j = await r.json();
    if (j.ok) {
      existentes.value = j.dados.boletins.map((b: any) => ({
        id: b.id, numero: b.numero, ano: b.ano, semana: String(b.semana).slice(0, 10),
      }));
    }
  } catch { /* segue sem checagem */ }
});

const conflito = computed(() => existentes.value.find((b) => b.semana === semana.value) ?? null);

async function onSubmit() {
  erro.value = "";
  if (conflito.value && !confirmado.value) { confirmado.value = true; return; }
  pendente.value = true;
  try {
    const fd = new FormData();
    fd.set("semana", semana.value);
    const r = await fetch("/api/boletins", { method: "POST", body: fd });
    const j = await r.json();
    if (j.ok) window.location.href = `/boletim/${j.id}`;
    else { erro.value = j.erro ?? "Falha ao criar boletim."; confirmado.value = false; }
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    pendente.value = false;
  }
}
</script>

<template>
  <CabecalhoPagina
    titulo="Novo boletim interno"
    descricao="Escolha a segunda-feira da semana. A Seção I (Escala de Serviço) será montada a partir da escala daquela semana."
    :migalhas="[{ rotulo: 'Boletim interno', href: '/boletim' }, { rotulo: 'Novo' }]"
  />

  <div class="max-w-xl rounded-xl border border-campo-200 bg-white p-6 shadow-sm">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <Aviso v-if="erro" tom="vermelho">{{ erro }}</Aviso>
      <Aviso v-if="conflito" tom="ouro">
        Já existe um boletim para esta semana (<a :href="`/boletim/${conflito.id}`" class="font-semibold underline">BI nº {{ String(conflito.numero).padStart(3, "0") }}/{{ conflito.ano }}</a>).
        Clique novamente em criar para registrar um novo mesmo assim (retificação).
      </Aviso>

      <Campo rotulo="Semana (segunda-feira)" obrigatorio dica="A escala da semana é a base da Seção I.">
        <input v-model="semana" type="date" name="semana" :class="classeInput" required />
      </Campo>

      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" :disabled="pendente" :class="classeBotaoPrimario">
          {{ pendente ? "Criando..." : confirmado ? "Confirmar criação" : "Criar boletim" }}
        </button>
        <a :class="classeBotaoSecundario" href="/boletim">Cancelar</a>
      </div>
    </form>
  </div>
</template>
