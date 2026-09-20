<script setup lang="ts">
import { ref } from "vue";
import Icone from "./Icone.vue";
import { classeBotaoSecundario } from "./ui.js";

const mensagem = ref<string | null>(null);
const executando = ref(false);

async function gerar() {
  executando.value = true;
  try {
    const r = await fetch("/api/convocacoes?acao=automaticas", { method: "POST" });
    const j = await r.json();
    mensagem.value = j.sucesso ?? j.erro ?? "Concluído.";
    if (j.ok) window.location.reload();
  } catch { mensagem.value = "Falha de rede."; }
  finally { executando.value = false; }
}
</script>

<template>
  <div class="flex flex-col items-end gap-1">
    <button type="button" :class="classeBotaoSecundario" :disabled="executando" @click="gerar">
      <Icone nome="calendario" className="h-4 w-4" />
      {{ executando ? "Varrendo prazos..." : "Gerar convocações automáticas" }}
    </button>
    <span v-if="mensagem" class="text-xs text-campo-600">{{ mensagem }}</span>
  </div>
</template>
