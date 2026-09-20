<script setup lang="ts">
import { ref } from "vue";
import { classeBotaoPerigo, classeBotaoSecundario } from "./ui.js";

const props = defineProps<{ usuarioId: number; ativo: boolean; proprio: boolean }>();
const mensagem = ref<string | null>(null);
const estado = ref(props.ativo);

async function alternar() {
  const r = await fetch("/api/usuarios?acao=status", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ usuarioId: props.usuarioId }),
  });
  const j = await r.json();
  mensagem.value = j.sucesso ?? j.erro ?? null;
  if (j.ok) estado.value = !estado.value;
}
</script>

<template>
  <span v-if="proprio" class="text-xs text-campo-400">usuário atual</span>
  <div v-else class="flex items-center gap-2">
    <button type="button" :class="estado ? classeBotaoPerigo : classeBotaoSecundario" @click="alternar">{{ estado ? "Desativar" : "Reativar" }}</button>
    <span v-if="mensagem" class="text-xs text-campo-600">{{ mensagem }}</span>
  </div>
</template>
