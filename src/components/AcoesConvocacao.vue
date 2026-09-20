<script setup lang="ts">
import { ref } from "vue";
import Aviso from "./Aviso.vue";
import { classeBotaoPerigo, classeBotaoPrimario, classeBotaoSecundario } from "./ui.js";

const props = defineProps<{ convocacaoId: number; status: string }>();
const mensagem = ref<string | null>(null);
const atual = ref(props.status);

async function executar(novo: "notificada" | "compareceu" | "nao_compareceu" | "cancelada") {
  const r = await fetch("/api/convocacoes?acao=atualizar", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ convocacaoId: props.convocacaoId, status: novo }),
  });
  const j = await r.json();
  mensagem.value = j.sucesso ?? j.erro ?? null;
  if (j.ok) { atual.value = novo; window.location.reload(); }
}
</script>

<template>
  <Aviso v-if="atual === 'cancelada'" tom="neutro">Convocação cancelada.{{ mensagem ? ` ${mensagem}` : "" }}</Aviso>
  <div v-else class="flex flex-wrap gap-2">
    <button v-if="atual === 'pendente'" type="button" :class="classeBotaoSecundario" @click="executar('notificada')">Marcar notificada</button>
    <template v-if="atual === 'pendente' || atual === 'notificada'">
      <button type="button" :class="classeBotaoPrimario" @click="executar('compareceu')">Compareceu</button>
      <button type="button" :class="classeBotaoPerigo" @click="executar('nao_compareceu')">Não compareceu</button>
      <button type="button" :class="classeBotaoSecundario" @click="executar('cancelada')">Cancelar</button>
    </template>
    <span v-if="mensagem" class="text-xs text-campo-600">{{ mensagem }}</span>
  </div>
</template>
