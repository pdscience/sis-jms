<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { formatDataHora } from "../lib/datas.js";
import { classeBotaoPrimario, classeInput, classeTd, classeTh } from "./ui.js";

const props = defineProps<{ busca?: string }>();
const buscaAtual = computed(() => props.busca ?? "");

const TOM_ACAO: Record<string, "verde" | "ambar" | "vermelho" | "azul" | "neutro" | "roxo"> = {
  LOGIN: "neutro", LOGOUT: "neutro", CADASTRAR_MILITAR: "azul", EDITAR_MILITAR: "azul",
  ALTERAR_SITUACAO: "ambar", RECEBER_ATESTADO_MILITAR: "verde", INSERIR_ATESTADO: "verde",
  MUDAR_STATUS_ATESTADO: "ambar", ARQUIVAR_ATESTADO: "vermelho", REGISTRAR_PARECER: "verde",
  HOMOLOGAR_ATA: "azul", PUBLICAR_BI: "roxo", ANULAR_ATA: "vermelho", EMITIR_PDF_ATA: "neutro",
  VISUALIZAR_ANEXO: "ambar", EMITIR_CONVOCACAO: "azul", CONVOCACAO_AUTOMATICA: "azul",
  ATUALIZAR_CONVOCACAO: "ambar", EXPORTAR_RELATORIO: "neutro", CRIAR_USUARIO: "roxo",
  DESATIVAR_USUARIO: "vermelho", ATIVAR_USUARIO: "verde",
};

const carregando = ref(true);
const erro = ref("");
const eventos = ref<any[]>([]);

onMounted(async () => {
  try {
    const q = new URLSearchParams({ busca: buscaAtual.value });
    const r = await fetch(`/api/auditoria?${q}`);
    const j = await r.json();
    if (j.ok) eventos.value = j.dados.eventos;
    else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
});
</script>

<template>
  <CabecalhoPagina
    titulo="Trilha de auditoria"
    descricao="Registro imutável de quem criou, homologou, alterou ou consultou cada atestado, ata e convocação."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Auditoria' }]"
  />

  <div class="mb-6">
    <Aviso tom="azul">A tabela <code class="font-mono">auditoria</code> possui regras de banco que bloqueiam UPDATE e DELETE: nenhum perfil — nem o administrador — consegue alterar ou apagar um evento registrado.</Aviso>
  </div>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando trilha…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <Card v-else :corpo="false">
    <form method="get" action="/auditoria" class="flex flex-wrap items-end gap-3 border-b border-campo-100 p-4">
      <div class="min-w-[240px] flex-1">
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Busca na trilha</span>
        <input name="busca" :value="buscaAtual" :class="classeInput" placeholder="Ação, usuário, entidade ou resumo" />
      </div>
      <button type="submit" :class="classeBotaoPrimario">Filtrar</button>
    </form>

    <div v-if="eventos.length === 0" class="p-5"><Vazio titulo="Nenhum evento encontrado" /></div>
    <div v-else class="rolagem-fina overflow-x-auto">
      <table class="min-w-full divide-y divide-campo-100 text-sm">
        <thead class="bg-campo-50/70"><tr><th :class="classeTh">Quando</th><th :class="classeTh">Usuário</th><th :class="classeTh">Ação</th><th :class="classeTh">Entidade</th><th :class="classeTh">Resumo</th><th :class="classeTh">IP</th></tr></thead>
        <tbody class="divide-y divide-campo-100">
          <tr v-for="evento in eventos" :key="evento.id" class="hover:bg-campo-50/60">
            <td :class="`${classeTd} text-xs tabular-nums`">{{ formatDataHora(evento.criadoEm) }}</td>
            <td :class="`${classeTd} text-xs`"><span class="font-semibold text-campo-900">{{ evento.usuarioNome }}</span><span class="block text-campo-500">{{ evento.papel ?? "sistema" }}</span></td>
            <td :class="classeTd"><Badge :tom="TOM_ACAO[evento.acao] ?? 'neutro'">{{ evento.acao.replace(/_/g, " ").toLowerCase() }}</Badge></td>
            <td :class="`${classeTd} text-xs`">{{ evento.entidade }}<span class="block font-mono text-campo-500">#{{ evento.entidadeId ?? "—" }}</span></td>
            <td :class="`${classeTd} text-xs text-campo-700`">{{ evento.resumo ?? "—" }}</td>
            <td :class="`${classeTd} font-mono text-[11px] text-campo-500`">{{ evento.ip ?? "—" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>

  <p class="mt-3 flex items-center gap-2 text-xs text-campo-500"><Icone nome="trilha" />{{ eventos.length }} evento(s) exibido(s) dos últimos registros.</p>
</template>
