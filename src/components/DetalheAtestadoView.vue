<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Barra from "./Barra.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import AcoesAtestado from "./AcoesAtestado.vue";
import { formatBR, formatDataHora } from "../lib/datas.js";
import {
  rotuloNivel, rotuloParecer, rotuloStatusAtestado,
  tomNivel, tomParecer, tomStatusAtestado,
  classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ registroId: number }>();

const carregando = ref(true);
const erro = ref("");
const dados = ref<any>(null);

const atestado = computed(() => dados.value?.atestado);
const militar = computed(() => dados.value?.militar);
const papel = computed(() => dados.value?.papel ?? "");
const ehMedico = computed(() => papel.value === "medico" || papel.value === "admin");
const urlAnexo = computed(() => `/api/atestados/${props.registroId}/arquivo`);
const ehImagem = computed(() => (atestado.value?.arquivoMime ?? "").startsWith("image/"));
const campos = computed<[string, string][]>(() => {
  if (!atestado.value) return [];
  const a = atestado.value;
  return [
    ["Emissão", formatBR(a.dataEmissao)],
    ["Apresentação na OM", formatBR(a.dataApresentacao)],
    ["Emitente", a.emitente ?? "—"],
    ["Dias sugeridos", `${a.diasSugeridos ?? 0} dia(s)`],
    ["Origem", a.origem === "militar" ? "Envio digital do policial militar" : "Inserção pela Secretaria"],
    ["CID-10", dados.value.completa ? (a.cid ?? "—") : "restrito à Junta"],
  ];
});

onMounted(async () => {
  try {
    const r = await fetch(`/api/atestados/${props.registroId}`);
    const j = await r.json();
    if (j.ok) dados.value = j.dados;
    else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
});
</script>

<template>
  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando atestado…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/atestados" class="font-semibold underline">Voltar</a></Aviso>
  <template v-else-if="dados">
    <CabecalhoPagina
      :titulo="`Atestado ${atestado.protocolo}`"
      :descricao="`${militar.postoGraduacao} ${militar.nomeGuerra ?? militar.nome} · RE ${militar.re} · ${militar.om}`"
      :migalhas="[{ rotulo: 'Atestados', href: '/atestados' }, { rotulo: atestado.protocolo }]"
    >
      <template #acoes>
        <a :href="`/militares/${militar.id}`" class="inline-flex items-center gap-2 rounded-lg border border-campo-300 bg-white px-4 py-2 text-sm font-semibold text-campo-800 hover:bg-campo-50">Abrir prontuário</a>
        <a v-if="ehMedico && atestado.status !== 'homologado'" :href="`/junta/parecer?atestadoId=${atestado.id}`" class="inline-flex items-center gap-2 rounded-lg bg-campo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-campo-800"><Icone nome="prancheta" className="h-4 w-4" /> Emitir parecer da Junta</a>
      </template>
    </CabecalhoPagina>

    <div class="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <Card titulo="Documento apresentado" :corpo="false">
        <div v-if="atestado.arquivoBase64" class="p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-campo-600">
            <span class="inline-flex items-center gap-1.5"><Icone nome="anexo" />{{ atestado.arquivoNome }} · {{ atestado.arquivoMime }}</span>
            <a :href="urlAnexo" target="_blank" rel="noreferrer" class="font-semibold text-campo-800 underline">Abrir em nova aba</a>
          </div>
          <img v-if="ehImagem" :src="urlAnexo" :alt="`Anexo do atestado ${atestado.protocolo}`" class="max-h-[560px] w-full rounded-lg border border-campo-200 object-contain" />
          <iframe v-else :src="urlAnexo" :title="`Anexo do atestado ${atestado.protocolo}`" class="h-[560px] w-full rounded-lg border border-campo-200 bg-white" />
        </div>
        <div v-else class="p-5"><Vazio titulo="Anexo não digitalizado" descricao="O documento físico foi conferido pela Secretaria; digitalize e substitua o registro quando disponível." /></div>
      </Card>

      <div class="space-y-6">
        <Card titulo="Dados do atestado">
          <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div v-for="[rotulo, valor] in campos" :key="rotulo">
              <dt class="text-xs uppercase tracking-wide text-campo-500">{{ rotulo }}</dt>
              <dd class="text-sm text-campo-900">{{ valor }}</dd>
            </div>
          </dl>
          <div class="mt-4">
            <p class="text-xs uppercase tracking-wide text-campo-500">Histórico / motivo informado</p>
            <p class="mt-1 rounded-lg bg-campo-50 p-3 text-sm text-campo-700">{{ dados.completa || atestado.origem === "secretaria" ? atestado.descricao : "Descrição clínica restrita aos membros da Junta." }}</p>
          </div>
          <div v-if="atestado.justificativa" class="mt-3"><Aviso tom="ambar"><strong>Registro da Junta:</strong> {{ atestado.justificativa }}</Aviso></div>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <Badge :tom="tomStatusAtestado(atestado.status)">{{ rotuloStatusAtestado(atestado.status) }}</Badge>
            <a v-if="atestado.inspecaoId" :href="`/atas/${atestado.inspecaoId}`" class="text-xs font-semibold text-campo-700 underline">Ver ata vinculada</a>
          </div>
        </Card>

        <Card titulo="Situação de prazos do policial militar">
          <div class="grid gap-4 sm:grid-cols-3">
            <div><p class="text-xs uppercase tracking-wide text-campo-500">Acumulado 12m</p><p class="text-xl font-semibold tabular-nums text-campo-900">{{ dados.resumo?.diasAcumulados ?? 0 }} dias</p></div>
            <div><p class="text-xs uppercase tracking-wide text-campo-500">Término atual</p><p class="text-xl font-semibold tabular-nums text-campo-900">{{ dados.resumo?.dataFim ? formatBR(dados.resumo.dataFim) : "—" }}</p></div>
            <div><p class="text-xs uppercase tracking-wide text-campo-500">Nível</p><p class="mt-1"><Badge :tom="tomNivel(dados.resumo?.nivel ?? 'regular')">{{ rotuloNivel(dados.resumo?.nivel ?? "regular") }}</Badge></p></div>
          </div>
          <div v-if="dados.resumo" class="mt-4">
            <Barra :valor="dados.resumo.diasAcumulados" :max="120" :tom="tomNivel(dados.resumo.nivel)" />
            <p class="mt-1 text-xs text-campo-500">Somando os {{ atestado.diasSugeridos ?? 0 }} dia(s) deste atestado, o acumulado chegaria a {{ dados.resumo.diasAcumulados + (atestado.diasSugeridos ?? 0) }} dia(s).</p>
          </div>
        </Card>

        <Card titulo="Providências da Secretaria / Junta">
          <AcoesAtestado :atestado-id="atestado.id" :status="atestado.status" :perfil="papel" />
        </Card>
      </div>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <Card titulo="Atestados anteriores do policial militar" :corpo="false">
        <div class="rolagem-fina overflow-x-auto">
          <table class="min-w-full divide-y divide-campo-100 text-sm">
            <thead class="bg-campo-50/70"><tr><th :class="classeTh">Protocolo</th><th :class="classeTh">Emissão</th><th :class="classeTh">Dias</th><th :class="classeTh">Situação</th></tr></thead>
            <tbody class="divide-y divide-campo-100">
              <tr v-for="item in dados.historicoAtestados" :key="item.id" class="hover:bg-campo-50/60">
                <td :class="classeTd"><a :href="`/atestados/${item.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ item.protocolo }}</a></td>
                <td :class="`${classeTd} text-xs tabular-nums`">{{ formatBR(item.dataEmissao) }}</td>
                <td :class="`${classeTd} tabular-nums`">{{ item.diasSugeridos ?? 0 }}</td>
                <td :class="classeTd"><Badge :tom="tomStatusAtestado(item.status)">{{ rotuloStatusAtestado(item.status) }}</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card titulo="Inspeções anteriores" :corpo="false">
        <div class="rolagem-fina overflow-x-auto">
          <table class="min-w-full divide-y divide-campo-100 text-sm">
            <thead class="bg-campo-50/70"><tr><th :class="classeTh">Ata</th><th :class="classeTh">Parecer</th><th :class="classeTh">Período</th></tr></thead>
            <tbody class="divide-y divide-campo-100">
              <tr v-for="ata in dados.historicoInspecoes" :key="ata.id" class="hover:bg-campo-50/60">
                <td :class="classeTd"><a :href="`/atas/${ata.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ ata.ataNumero }}</a><span class="block text-xs text-campo-500">{{ formatBR(ata.dataInspecao) }}</span></td>
                <td :class="classeTd"><Badge :tom="tomParecer(ata.parecer)">{{ rotuloParecer(ata.parecer) }}</Badge></td>
                <td :class="`${classeTd} text-xs tabular-nums`">{{ ata.diasAfastamento > 0 ? `${ata.diasAfastamento}d · ${formatBR(ata.dataInicio)} a ${formatBR(ata.dataFim)}` : "sem afastamento" }}</td>
              </tr>
              <tr v-if="dados.historicoInspecoes.length === 0"><td :class="classeTd" colspan="3"><span class="text-campo-500">Primeira inspeção deste policial militar.</span></td></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <Card titulo="Trilha de auditoria do documento" className="mt-6" :corpo="false">
      <ul class="divide-y divide-campo-100">
        <li v-for="evento in dados.eventos" :key="evento.id" class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
          <span class="font-semibold text-campo-900">{{ evento.acao.replace(/_/g, " ") }}</span>
          <span class="text-campo-700">{{ evento.resumo }}</span>
          <span class="text-xs tabular-nums text-campo-500">{{ formatDataHora(evento.criadoEm) }} · {{ evento.usuarioNome }}{{ evento.ip ? ` · IP ${evento.ip}` : "" }}</span>
        </li>
        <li v-if="dados.eventos.length === 0" class="px-5 py-6 text-sm text-campo-500">Sem eventos registrados.</li>
      </ul>
    </Card>
  </template>
</template>
