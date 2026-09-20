<script setup lang="ts">
import { ref } from "vue";
import Aviso from "./Aviso.vue";
import { classeBotaoPerigo, classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";

const props = defineProps<{
  militarId: number;
  situacao?: string;
  podeEditar?: boolean;
  opcoes?: { valor: string; rotulo: string }[];
  motivoPadrao?: string;
  dataPadrao?: string;
}>();

// Seletor de situação
const mensagemSit = ref<string | null>(null);
const valorSit = ref(props.situacao ?? "ativo");
async function atualizarSituacao() {
  const r = await fetch("/api/militares/situacao", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ militarId: props.militarId, situacao: valorSit.value }),
  });
  const j = await r.json();
  mensagemSit.value = j.sucesso ?? j.erro ?? null;
  if (j.ok) window.location.reload();
}

// Formulário de convocação
const aberto = ref(false);
const mensagemConv = ref<string | null>(null);
function emDias(dias: number) {
  const d = new Date(); d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
async function emitirConvocacao(e: Event) {
  const fd = new FormData(e.target as HTMLFormElement);
  fd.set("militarId", String(props.militarId));
  const r = await fetch("/api/convocacoes", { method: "POST", body: fd });
  const j = await r.json();
  mensagemConv.value = j.sucesso ?? j.erro ?? null;
  if (j.ok) { aberto.value = false; window.location.reload(); }
}
</script>

<template>
  <div v-if="opcoes && podeEditar" class="flex flex-wrap items-center gap-2">
    <select v-model="valorSit" :class="classeInput" :disabled="!podeEditar">
      <option v-for="o in opcoes" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
    </select>
    <button v-if="podeEditar" type="button" :class="classeBotaoSecundario" @click="atualizarSituacao">Atualizar situação</button>
    <span v-if="mensagemSit" class="text-xs text-campo-600">{{ mensagemSit }}</span>
  </div>

  <div v-else>
    <button v-if="!aberto" type="button" :class="classeBotaoPrimario" @click="aberto = true">Convocar para reavaliação</button>
    <form v-else class="w-full space-y-3 rounded-xl border border-campo-200 bg-campo-50 p-4" @submit.prevent="emitirConvocacao">
      <div class="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Motivo da convocação</span>
          <input name="motivo" :class="classeInput" :value="motivoPadrao ?? 'Comparecimento à Junta Médica de Saúde para reavaliação do estado de saúde'" required />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Data limite</span>
          <input type="date" name="dataLimite" :class="classeInput" :value="dataPadrao ?? emDias(15)" required />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Canal de notificação</span>
          <select name="canal" :class="classeInput">
            <option>Boletim Geral</option>
            <option>Boletim Geral / Contato telefônico</option>
            <option>Contato telefônico</option>
            <option>Notificação eletrônica</option>
          </select>
        </label>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="submit" :class="classeBotaoPrimario">Emitir convocação</button>
        <button type="button" :class="classeBotaoPerigo" @click="aberto = false">Cancelar</button>
        <span v-if="mensagemConv" class="text-xs text-campo-600">{{ mensagemConv }}</span>
      </div>
    </form>
  </div>
</template>
