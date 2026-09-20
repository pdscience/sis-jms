<script setup lang="ts">
import { ref } from "vue";
import Icone from "./Icone.vue";
import { classeBotaoPerigo, classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";

const props = defineProps<{ inspecaoId: number; status: string; papel: string; biPadrao: string }>();
const mensagem = ref<string | null>(null);
const atual = ref(props.status);
const publicando = ref(false);
const anulando = ref(false);
const bi = ref(props.biPadrao);
const motivo = ref("");
const ocupado = ref(false);

const ehMedico = props.papel === "medico" || props.papel === "admin";
const podePublicar = props.papel === "admin" || props.papel === "secretaria";

async function postJson(acao: string, body: unknown) {
  const r = await fetch(`/api/junta?acao=${acao}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

async function homologar() {
  ocupado.value = true;
  try {
    const j = await postJson("homologar", { inspecaoId: props.inspecaoId });
    mensagem.value = j.sucesso ?? j.erro ?? null;
    if (j.ok) { atual.value = "homologada"; window.location.reload(); }
  } finally { ocupado.value = false; }
}

async function publicar(e: Event) {
  const r = await fetch("/api/junta?acao=publicar", { method: "POST", body: new FormData(e.target as HTMLFormElement) });
  const j = await r.json();
  mensagem.value = j.sucesso ?? j.erro ?? null;
  if (j.ok) { atual.value = "publicada"; publicando.value = false; window.location.reload(); }
}

async function anular() {
  const j = await postJson("anular", { inspecaoId: props.inspecaoId, motivo: motivo.value });
  mensagem.value = j.sucesso ?? j.erro ?? null;
  if (j.ok) { atual.value = "rascunho"; anulando.value = false; window.location.reload(); }
}

function imprimir() {
  window.print();
}
</script>

<template>
  <div class="flex flex-wrap items-start gap-2">
    <a :href="`/api/atas/${inspecaoId}/pdf`" target="_blank" rel="noreferrer" :class="classeBotaoPrimario"><Icone nome="download" /> Baixar ata (PDF)</a>
    <button type="button" :class="classeBotaoSecundario" @click="imprimir"><Icone nome="impressora" /> Imprimir</button>

    <button v-if="ehMedico && atual === 'emitida'" type="button" :class="classeBotaoSecundario" :disabled="ocupado" @click="homologar">Homologar ata</button>
    <button v-if="podePublicar && atual !== 'publicada'" type="button" :class="classeBotaoSecundario" @click="publicando = !publicando">Publicar extrato em BG</button>
    <button v-if="papel === 'admin' && atual !== 'rascunho'" type="button" :class="classeBotaoPerigo" @click="anulando = !anulando">Anular ata</button>

    <form v-if="publicando" class="w-full space-y-2 rounded-xl border border-campo-200 bg-campo-50 p-3" @submit.prevent="publicar">
      <input type="hidden" name="inspecaoId" :value="inspecaoId" />
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Referência do Boletim Geral</span>
        <input v-model="bi" name="biNumero" :class="classeInput" placeholder="ex.: BG nº 128, de 12/03/2026" required />
      </label>
      <button type="submit" :class="classeBotaoPrimario">Confirmar publicação</button>
    </form>

    <div v-if="anulando" class="w-full space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-red-700">Motivo da anulação (registrado em auditoria)</span>
        <input v-model="motivo" :class="classeInput" placeholder="ex.: erro material na contagem de dias" required />
      </label>
      <button type="button" :class="classeBotaoPerigo" @click="anular">Confirmar anulação</button>
    </div>

    <p v-if="mensagem" class="w-full text-xs text-campo-600">{{ mensagem }}</p>
  </div>
</template>
