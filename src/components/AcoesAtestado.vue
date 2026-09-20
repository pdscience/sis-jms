<script setup lang="ts">
import { ref } from "vue";
import { classeBotaoPerigo, classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";

type Status = "pendente" | "em_analise" | "arquivado" | "nao_homologado";

const props = defineProps<{ atestadoId: number; status: string; perfil: string }>();
const mensagem = ref<string | null>(null);
const atual = ref(props.status);
const pedindo = ref<Status | null>(null);
const justificativa = ref("");
const ocupado = ref(false);

const ehMedico = props.perfil === "medico" || props.perfil === "admin";

async function executar(novo: Status, texto?: string) {
  ocupado.value = true;
  try {
    const r = await fetch("/api/atestados?acao=status", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ atestadoId: props.atestadoId, status: novo, justificativa: texto }),
    });
    const j = await r.json();
    mensagem.value = j.sucesso ?? j.erro ?? null;
    if (j.ok) { atual.value = novo; window.location.reload(); }
  } catch { mensagem.value = "Falha de rede."; }
  finally { pedindo.value = null; justificativa.value = ""; ocupado.value = false; }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <button v-if="atual === 'pendente'" type="button" :class="classeBotaoPrimario" :disabled="ocupado" @click="executar('em_analise')">Iniciar análise</button>
      <button v-if="atual === 'em_analise'" type="button" :class="classeBotaoSecundario" :disabled="ocupado" @click="executar('pendente')">Devolver à triagem</button>
      <button v-if="ehMedico && atual !== 'homologado'" type="button" :class="classeBotaoPerigo" :disabled="ocupado" @click="pedindo = 'nao_homologado'">Não homologar</button>
      <button v-if="atual !== 'arquivado'" type="button" :class="classeBotaoSecundario" :disabled="ocupado" @click="pedindo = 'arquivado'">Arquivar</button>
    </div>

    <div v-if="pedindo" class="space-y-2 rounded-lg border border-campo-200 bg-campo-50 p-3">
      <label class="block text-xs font-semibold uppercase tracking-wide text-campo-600">Justificativa (registrada na auditoria)</label>
      <textarea v-model="justificativa" rows="2" :class="classeInput" :placeholder="pedindo === 'arquivado' ? 'ex.: documento ilegível, devolvido ao policial militar' : 'ex.: atestado sem afastamento prescrito; policial militar avaliado como apto'" />
      <div class="flex gap-2">
        <button type="button" :class="classeBotaoPrimario" @click="executar(pedindo, justificativa)">Confirmar</button>
        <button type="button" :class="classeBotaoSecundario" @click="pedindo = null">Cancelar</button>
      </div>
    </div>

    <p v-if="mensagem" class="text-xs text-campo-600">{{ mensagem }}</p>
  </div>
</template>
