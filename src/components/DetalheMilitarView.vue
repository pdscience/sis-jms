<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Barra from "./Barra.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import AcoesMilitar from "./AcoesMilitar.vue";
import AcoesConvocacao from "./AcoesConvocacao.vue";
import { formatBR, formatDataHora } from "../lib/datas.js";
import { LIMITE_AGREGACAO_DIAS, SITUACAO_MILITAR_LABEL } from "../lib/dominio.js";
import {
  rotuloNivel, rotuloParecer, rotuloStatusAta, rotuloStatusAtestado,
  tomNivel, tomParecer, tomStatusAta, tomStatusAtestado,
  classeBotaoSecundario, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ registroId: number }>();

const carregando = ref(true);
const erro = ref("");
const dados = ref<any>(null);

const militar = computed(() => dados.value?.militar);
const resumo = computed(() => dados.value?.resumo);
const papel = computed(() => dados.value?.papel ?? "");
const podeEditar = computed(() => ["admin", "secretaria"].includes(papel.value));
const ehMedico = computed(() => ["admin", "medico"].includes(papel.value));
const podeConvocar = computed(() => ["admin", "secretaria", "medico"].includes(papel.value));
const porcentagemAgregacao = computed(() => resumo.value ? Math.min(100, Math.round((resumo.value.diasAcumulados / LIMITE_AGREGACAO_DIAS) * 100)) : 0);
const campos = computed<[string, string | null][]>(() => {
  if (!militar.value) return [];
  const m = militar.value;
  return [
    ["Nome completo", m.nome],
    ["Nome de guerra", m.nomeGuerra],
    ["Posto/Graduação", m.postoGraduacao],
    ["Quadro", m.quadro],
    ["Função", m.funcao],
    ["Organização Policial Militar", m.om],
    ["Data de nascimento", m.dataNascimento ? formatBR(m.dataNascimento) : null],
    ["Tipo sanguíneo", m.tipoSanguineo],
    ["Contato", m.telefone],
    ["E-mail", m.email],
    ["Inclusão", m.dataInclusao ? formatBR(m.dataInclusao) : null],
    ["Situação", SITUACAO_MILITAR_LABEL[m.situacao] ?? m.situacao],
  ];
});

onMounted(async () => {
  try {
    const r = await fetch(`/api/militares/${props.registroId}`);
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
  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando prontuário…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/militares" class="font-semibold underline">Voltar</a></Aviso>
  <template v-else-if="dados">
    <CabecalhoPagina
      :titulo="`${militar.postoGraduacao} ${militar.nomeGuerra ?? militar.nome}`"
      :descricao="`Prontuário administrativo-sanitário · RE ${militar.re}${militar.cpf ? ` · CPF ${militar.cpf}` : ''} · ${militar.om}`"
      :migalhas="[{ rotulo: 'Policiais Militares', href: '/militares' }, { rotulo: militar.nomeGuerra ?? militar.nome }]"
    >
      <template #acoes>
        <a v-if="podeEditar" :href="`/militares/${militar.id}/editar`" :class="classeBotaoSecundario">Editar cadastro</a>
        <a v-if="podeEditar" :href="`/atestados?novo=1&militar=${militar.id}`" :class="classeBotaoSecundario"><Icone nome="documento" className="h-4 w-4" /> Registrar atestado</a>
        <a v-if="ehMedico" :href="`/junta/parecer?militarId=${militar.id}`" class="inline-flex items-center gap-2 rounded-lg bg-campo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-campo-800"><Icone nome="prancheta" className="h-4 w-4" /> Nova inspeção</a>
      </template>
    </CabecalhoPagina>

    <Aviso v-if="!dados.completa" tom="ouro">
      <div class="mb-6">
        Perfil de acesso administrativo: CID, anamnese, exames e anexos de atestados estão
        suprimidos em observância ao sigilo médico (LGPD, art. 11).
      </div>
    </Aviso>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card titulo="Controle de prazo e agregação">
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-campo-500">Acumulado 12 meses</p>
            <p class="mt-1 text-2xl font-semibold tabular-nums text-campo-900">{{ resumo.diasAcumulados }}<span class="ml-1 text-sm font-normal text-campo-500">dias</span></p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-campo-500">Término atual</p>
            <p class="mt-1 text-2xl font-semibold tabular-nums text-campo-900">{{ resumo.dataFim ? formatBR(resumo.dataFim) : "—" }}</p>
            <p v-if="resumo.dataFim" class="text-xs text-campo-500">{{ resumo.diasRestantes >= 0 ? `faltam ${resumo.diasRestantes} dia(s)` : `vencido há ${Math.abs(resumo.diasRestantes)} dia(s)` }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-campo-500">Nível</p>
            <p class="mt-2"><Badge :tom="tomNivel(resumo.nivel)">{{ rotuloNivel(resumo.nivel) }}</Badge></p>
            <p v-if="resumo.agregado" class="mt-2"><Badge tom="roxo">agregado</Badge></p>
          </div>
        </div>
        <div class="mt-5">
          <div class="mb-1 flex items-center justify-between text-xs text-campo-600">
            <span>Progressão para o limite de agregação ({{ LIMITE_AGREGACAO_DIAS }} dias)</span>
            <span class="tabular-nums font-semibold">{{ porcentagemAgregacao }}% · restam {{ resumo.diasParaAgregacao }} dia(s)</span>
          </div>
          <Barra :valor="resumo.diasAcumulados" :max="LIMITE_AGREGACAO_DIAS" :tom="resumo.diasAcumulados > LIMITE_AGREGACAO_DIAS * 0.8 ? 'vermelho' : 'verde'" />
        </div>
        <div class="mt-5">
          <AcoesMilitar :militar-id="militar.id" :situacao="militar.situacao" :pode-editar="podeEditar" :opcoes="Object.entries(SITUACAO_MILITAR_LABEL).map(([valor, rotulo]) => ({ valor, rotulo }))" />
        </div>
        <div v-if="podeConvocar" class="mt-4">
          <AcoesMilitar :militar-id="militar.id" :motivo-padrao="resumo.dataFim ? `Reavaliação da JIS — afastamento encerra em ${formatBR(resumo.dataFim)}` : undefined" :data-padrao="resumo.dataFim ?? undefined" />
        </div>
      </Card>

      <Card titulo="Dados do policial militar">
        <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div v-for="[rotulo, valor] in campos" :key="String(rotulo)">
            <dt class="text-xs uppercase tracking-wide text-campo-500">{{ rotulo }}</dt>
            <dd class="text-sm text-campo-900">{{ valor ? String(valor) : "—" }}</dd>
          </div>
        </dl>
        <p v-if="militar.observacoes" class="mt-4 rounded-lg bg-campo-50 p-3 text-sm text-campo-700"><span class="font-semibold">Observações: </span>{{ militar.observacoes }}</p>
      </Card>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <Card titulo="Histórico de inspeções de saúde" :corpo="false" :descricao="`${dados.inspecoes.length} ata(s) registrada(s)`">
        <div v-if="dados.inspecoes.length === 0" class="p-5"><Vazio titulo="Nenhuma inspeção registrada" /></div>
        <div v-else class="rolagem-fina overflow-x-auto">
          <table class="min-w-full divide-y divide-campo-100 text-sm">
            <thead class="bg-campo-50/70"><tr><th :class="classeTh">Ata</th><th :class="classeTh">Parecer</th><th :class="classeTh">Período</th><th :class="classeTh">Situação</th></tr></thead>
            <tbody class="divide-y divide-campo-100">
              <tr v-for="ata in dados.inspecoes" :key="ata.id" class="hover:bg-campo-50/60">
                <td :class="classeTd">
                  <a :href="`/atas/${ata.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ ata.ataNumero }}</a>
                  <span class="block text-xs text-campo-500">{{ formatBR(ata.dataInspecao) }} · {{ ata.tipo.replace("_", " ") }}</span>
                  <span v-if="dados.completa && ata.cid" class="mt-0.5 block text-xs text-campo-500">CID {{ ata.cid }}</span>
                </td>
                <td :class="classeTd"><Badge :tom="tomParecer(ata.parecer)">{{ rotuloParecer(ata.parecer) }}</Badge></td>
                <td :class="`${classeTd} text-xs tabular-nums`">{{ ata.diasAfastamento > 0 ? `${ata.diasAfastamento}d · ${formatBR(ata.dataInicio)} a ${formatBR(ata.dataFim)}` : "sem afastamento" }}</td>
                <td :class="classeTd"><Badge :tom="tomStatusAta(ata.status)">{{ rotuloStatusAta(ata.status) }}</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card titulo="Atestados recebidos" :corpo="false" :descricao="`${dados.atestados.length} documento(s) no fluxo`">
        <div v-if="dados.atestados.length === 0" class="p-5"><Vazio titulo="Nenhum atestado recebido" /></div>
        <div v-else class="rolagem-fina overflow-x-auto">
          <table class="min-w-full divide-y divide-campo-100 text-sm">
            <thead class="bg-campo-50/70"><tr><th :class="classeTh">Protocolo</th><th :class="classeTh">Emissão</th><th :class="classeTh">Dias</th><th :class="classeTh">Situação</th></tr></thead>
            <tbody class="divide-y divide-campo-100">
              <tr v-for="atestado in dados.atestados" :key="atestado.id" class="hover:bg-campo-50/60">
                <td :class="classeTd">
                  <a :href="`/atestados/${atestado.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ atestado.protocolo }}</a>
                  <span class="block text-xs text-campo-500">{{ atestado.emitente ?? "emitente não informado" }}</span>
                  <span v-if="dados.completa && atestado.cid" class="text-xs text-campo-500">CID {{ atestado.cid }}</span>
                </td>
                <td :class="`${classeTd} text-xs tabular-nums`">{{ formatBR(atestado.dataEmissao) }}<span class="block text-campo-500">apresentado {{ formatBR(atestado.dataApresentacao) }}</span></td>
                <td :class="`${classeTd} tabular-nums`">{{ atestado.diasSugeridos ?? 0 }}</td>
                <td :class="classeTd"><Badge :tom="tomStatusAtestado(atestado.status)">{{ rotuloStatusAtestado(atestado.status) }}</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <Card titulo="Afastamentos consolidados" :corpo="false">
        <div class="rolagem-fina overflow-x-auto">
          <table class="min-w-full divide-y divide-campo-100 text-sm">
            <thead class="bg-campo-50/70"><tr><th :class="classeTh">Tipo</th><th :class="classeTh">Período</th><th :class="classeTh">Dias</th><th :class="classeTh">Situação</th></tr></thead>
            <tbody class="divide-y divide-campo-100">
              <tr v-for="a in dados.afastamentos" :key="a.id">
                <td :class="classeTd">{{ a.tipo.replace(/_/g, " ") }}</td>
                <td :class="`${classeTd} text-xs tabular-nums`">
                  {{ formatBR(a.dataInicio) }} a {{ formatBR(a.dataFim) }}
                  <span v-if="a.agregadoDesde" class="block text-violet-700">agregado desde {{ formatBR(a.agregadoDesde) }}</span>
                </td>
                <td :class="`${classeTd} tabular-nums`">{{ a.dias }}</td>
                <td :class="classeTd"><Badge :tom="a.situacao === 'vigente' ? 'verde' : a.situacao === 'prorrogado' ? 'ambar' : 'neutro'">{{ a.situacao }}</Badge></td>
              </tr>
              <tr v-if="dados.afastamentos.length === 0"><td :class="classeTd" colspan="4"><span class="text-campo-500">Sem afastamentos registrados.</span></td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card titulo="Convocações para reavaliação" :corpo="false">
        <ul class="divide-y divide-campo-100">
          <li v-for="c in dados.convocacoes" :key="c.id" class="space-y-2 px-5 py-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="text-sm font-semibold text-campo-900">{{ c.motivo }}</p>
                <p class="text-xs text-campo-500">Emitida em {{ formatBR(c.emitidaEm) }} · limite {{ formatBR(c.dataLimite) }} · {{ c.canal }}</p>
              </div>
              <Badge :tom="c.status === 'compareceu' ? 'verde' : c.status === 'nao_compareceu' ? 'vermelho' : c.status === 'cancelada' ? 'neutro' : 'ambar'">{{ c.status.replace('_', ' ') }}</Badge>
            </div>
            <AcoesConvocacao v-if="(ehMedico || podeEditar) && c.status !== 'cancelada'" :convocacao-id="c.id" :status="c.status" />
          </li>
          <li v-if="dados.convocacoes.length === 0" class="px-5 py-6"><Vazio titulo="Nenhuma convocação emitida" /></li>
        </ul>
      </Card>
    </div>

    <Card titulo="Trilha de auditoria do prontuário" className="mt-6" :corpo="false">
      <ul class="divide-y divide-campo-100">
        <li v-for="evento in dados.eventos" :key="evento.id" class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
          <span class="font-medium text-campo-900">{{ evento.acao.replace(/_/g, " ") }}</span>
          <span class="text-campo-700">{{ evento.resumo }}</span>
          <span class="text-xs tabular-nums text-campo-500">{{ formatDataHora(evento.criadoEm) }} · {{ evento.usuarioNome }}</span>
        </li>
        <li v-if="dados.eventos.length === 0" class="px-5 py-6 text-sm text-campo-500">Sem eventos registrados.</li>
      </ul>
    </Card>
  </template>
</template>
