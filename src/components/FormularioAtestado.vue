<script setup lang="ts">
import { computed, ref } from "vue";
import Campo from "./Campo.vue";
import Aviso from "./Aviso.vue";
import Icone from "./Icone.vue";
import { classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";
import { CIDS_FREQUENTES } from "../lib/dominio.js";

export type MilitarOpcao = { id: number; re: string; nome: string; nomeGuerra: string | null; postoGraduacao: string; om: string };

const props = defineProps<{ canal: "militar" | "secretaria"; militares?: MilitarOpcao[]; militarIdInicial?: number | null }>();

const erro = ref("");
const sucesso = ref("");
const pendente = ref(false);
const chave = ref(0);
const busca = ref("");

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const opcoes = computed(() => {
  const termo = busca.value.trim().toLowerCase();
  const lista = props.militares ?? [];
  if (!termo) return lista;
  return lista.filter((m) => [m.nome, m.nomeGuerra, m.re, m.postoGraduacao, m.om].filter(Boolean).some((v) => v!.toLowerCase().includes(termo)));
});

async function onSubmit(e: Event) {
  erro.value = "";
  pendente.value = true;
  try {
    const r = await fetch("/api/atestados", { method: "POST", body: new FormData(e.target as HTMLFormElement) });
    const j = await r.json();
    if (j.ok) sucesso.value = j.sucesso ?? "Enviado.";
    else erro.value = j.erro ?? "Falha no envio.";
  } catch { erro.value = "Falha de rede ao enviar."; }
  finally { pendente.value = false; }
}

function outro() { sucesso.value = ""; erro.value = ""; chave.value += 1; }
</script>

<template>
  <div v-if="sucesso" class="space-y-4">
    <Aviso tom="verde"><span class="flex items-start gap-2"><Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0" /><span>{{ sucesso }}</span></span></Aviso>
    <div class="flex flex-wrap gap-2">
      <button type="button" :class="classeBotaoPrimario" @click="outro">Enviar outro atestado</button>
      <a v-if="canal === 'secretaria'" href="/atestados" :class="classeBotaoSecundario">Ir para a fila de atestados</a>
    </div>
  </div>

  <form v-else :key="chave" class="space-y-5" enctype="multipart/form-data" @submit.prevent="onSubmit">
    <input type="hidden" name="canal" :value="canal" />
    <Aviso v-if="erro" tom="vermelho">{{ erro }}</Aviso>

    <div v-if="canal === 'militar'" class="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="RE" obrigatorio dica="Registro Estatístico"><input name="re" :class="classeInput" placeholder="ex.: 1045872" required /></Campo>
      <Campo rotulo="CPF" obrigatorio dica="Somente números"><input name="cpf" :class="classeInput" placeholder="000.000.000-00" required /></Campo>
    </div>
    <Campo v-else rotulo="Policial militar" obrigatorio>
      <div class="space-y-2">
        <input v-model="busca" type="text" :class="classeInput" placeholder="Filtrar por nome, RE, posto ou OM..." />
        <select name="militarId" :class="classeInput" :size="Math.min(opcoes.length, 6) || 4" :value="militarIdInicial ?? undefined" required>
          <option v-for="m in opcoes" :key="m.id" :value="m.id" :selected="militarIdInicial === m.id">{{ m.postoGraduacao }} {{ m.nomeGuerra ?? m.nome }} — RE {{ m.re }} · {{ m.om }}</option>
        </select>
      </div>
    </Campo>

    <div class="grid gap-4 sm:grid-cols-3">
      <Campo rotulo="Data de emissão" obrigatorio><input type="date" name="dataEmissao" :class="classeInput" :value="hojeISO()" required /></Campo>
      <Campo rotulo="Apresentação na OM" obrigatorio><input type="date" name="dataApresentacao" :class="classeInput" :value="hojeISO()" required /></Campo>
      <Campo rotulo="Dias de afastamento sugeridos" obrigatorio><input type="number" name="diasSugeridos" min="1" max="730" :class="classeInput" placeholder="ex.: 7" required /></Campo>
    </div>

    <div class="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
      <Campo rotulo="Profissional / instituição emitente" obrigatorio><input name="emitente" :class="classeInput" placeholder="ex.: Dr. Henrique Sales — Clínica Vida" required /></Campo>
      <Campo rotulo="CID-10 (opcional)" dica="Preenchido quando houver autorização do policial militar">
        <input name="cid" list="cids-frequentes" :class="classeInput" placeholder="ex.: M54.5" />
        <datalist id="cids-frequentes"><option v-for="cid in CIDS_FREQUENTES" :key="cid" :value="cid" /></datalist>
      </Campo>
    </div>

    <Campo rotulo="Histórico / motivo do afastamento" obrigatorio>
      <textarea name="descricao" rows="4" :class="classeInput" placeholder="Descreva o quadro informado no documento, medicação e orientações recebidas." required />
    </Campo>

    <Campo rotulo="Anexo do atestado (PDF, PNG ou JPEG — até 4 MB)" :obrigatorio="canal === 'secretaria'">
      <div class="flex items-center gap-3 rounded-lg border border-dashed border-campo-300 bg-campo-50 px-3 py-3">
        <span class="text-campo-500"><Icone nome="anexo" className="h-5 w-5" /></span>
        <input type="file" name="arquivo" accept="application/pdf,image/png,image/jpeg" class="block w-full text-sm text-campo-700 file:mr-3 file:rounded-md file:border-0 file:bg-campo-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-campo-800" :required="canal === 'secretaria'" />
      </div>
    </Campo>

    <div class="flex flex-wrap items-center gap-3">
      <button type="submit" :disabled="pendente" :class="classeBotaoPrimario">{{ pendente ? "Enviando..." : canal === "militar" ? "Enviar atestado" : "Registrar na fila" }}</button>
      <p class="text-xs text-campo-500">O envio gera protocolo e registro imutável na trilha de auditoria.</p>
    </div>
  </form>
</template>
