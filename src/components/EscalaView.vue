<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import FormularioEscala from "./FormularioEscala.vue";
import {
  classeBotaoPrimario, classeBotaoSecundario, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ semana: string }>();

type ItemEscala = {
  id: number; semana: string; dia: number; turno: string;
  setorId: number; efetivoId: number; observacao: string | null;
  pessoa: { id: number; nome: string; postoGraduacao: string | null } | null;
};
type BlocoSetor = { setor: { id: number; nome: string }; itens: ItemEscala[] };
type DiaGrade = { dia: number; rotulo: string; setores: BlocoSetor[] };

const carregando = ref(true);
const erro = ref("");
const dias = ref<DiaGrade[]>([]);
const setores = ref<{ id: number; nome: string }[]>([]);
const pessoas = ref<{ id: number; nome: string; postoGraduacao: string | null }[]>([]);
const papel = ref("");
const mostrandoForm = ref(false);
const acaoErro = ref("");
const acaoMsg = ref("");

const podeAdmin = computed(() => papel.value === "admin");

function segundaISO(base: string, deltaDias: number): string {
  const [a, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + deltaDias, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}
const semanaAnterior = computed(() => segundaISO(props.semana, -7));
const semanaSeguinte = computed(() => segundaISO(props.semana, 7));

function imprimir() {
  window.print();
}

function itensPorTurno(itens: ItemEscala[]): { turno: string; itens: ItemEscala[] }[] {
  const ordem = ["manhã", "tarde", "integral", "plantão"];
  const grupos = new Map<string, ItemEscala[]>();
  for (const it of itens) {
    const lista = grupos.get(it.turno) ?? [];
    lista.push(it);
    grupos.set(it.turno, lista);
  }
  return [...grupos.entries()]
    .sort((a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]))
    .map(([turno, lista]) => ({ turno, itens: lista }));
}

const totalItens = computed(() => dias.value.reduce(
  (acc, d) => acc + d.setores.reduce((a2, s) => a2 + s.itens.length, 0), 0,
));

async function carregar() {
  carregando.value = true;
  erro.value = "";
  try {
    const q = new URLSearchParams({ semana: props.semana });
    const r = await fetch(`/api/escalas?${q}`);
    const j = await r.json();
    if (j.ok) {
      dias.value = j.dados.dias ?? [];
      setores.value = (j.dados.setores ?? []).map((s: any) => ({ id: s.id, nome: s.nome }));
      pessoas.value = (j.dados.pessoas ?? []).map((p: any) => ({ id: p.id, nome: p.nome, postoGraduacao: p.postoGraduacao }));
    } else {
      erro.value = j.erro ?? "Falha ao carregar escala.";
    }
    const rm = await fetch("/api/militares?busca=&situacao=todas");
    const jm = await rm.json().catch(() => null);
    if (jm?.ok) papel.value = jm.dados.papel ?? "";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
}

onMounted(carregar);

async function remover(id: number) {
  acaoErro.value = ""; acaoMsg.value = "";
  try {
    const r = await fetch("/api/escalas?acao=remover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await r.json();
    if (j.ok) {
      acaoMsg.value = j.sucesso ?? "Plantão removido.";
      await carregar();
    } else {
      acaoErro.value = j.erro ?? "Falha ao remover plantão.";
    }
  } catch {
    acaoErro.value = "Falha de rede.";
  }
}
</script>

<template>
  <CabecalhoPagina
    titulo="Escala semanal de serviço"
    descricao="Grade de segunda a domingo por setor ativo, com impressão para afixação em quadro de avisos."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Escala' }]"
  >
    <template #acoes>
      <a :class="classeBotaoSecundario" :href="`/escala?semana=${semanaAnterior}`">← Semana anterior</a>
      <a :class="classeBotaoSecundario" :href="`/escala?semana=${semanaSeguinte}`">Próxima semana →</a>
      <button type="button" :class="classeBotaoSecundario" @click="imprimir"><Icone nome="impressora" className="h-4 w-4" /> Imprimir</button>
      <button v-if="podeAdmin && !mostrandoForm" type="button" :class="classeBotaoPrimario" @click="mostrandoForm = true"><Icone nome="mais" className="h-4 w-4" /> Novo plantão</button>
    </template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <template v-else>
    <Aviso v-if="acaoErro" tom="vermelho">{{ acaoErro }}</Aviso>
    <Aviso v-if="acaoMsg" tom="verde">{{ acaoMsg }}</Aviso>

    <Card v-if="mostrandoForm && podeAdmin" titulo="Novo plantão" :descricao="`Semana de ${semana}.`" className="mb-5">
      <FormularioEscala :semana="semana" :setores="setores" :pessoas="pessoas" @salvo="carregar" />
      <div class="mt-4">
        <button type="button" :class="classeBotaoSecundario" @click="mostrandoForm = false">Fechar</button>
      </div>
    </Card>

    <p class="mb-4 text-sm text-campo-600">Semana iniciada em <strong class="text-campo-900">{{ semana }}</strong> · {{ totalItens }} plantão(ões) escalado(s).</p>

    <div id="area-impressao" class="space-y-5">
      <Card v-for="dia in dias" :key="dia.dia" :titulo="`${dia.rotulo} · ${semana}`" :corpo="false">
        <div v-if="dia.setores.every((s) => s.itens.length === 0)" class="p-5">
          <Vazio titulo="Sem plantões neste dia" descricao="Nenhum setor possui plantão escalado para este dia da semana." />
        </div>
        <div v-else class="rolagem-fina overflow-x-auto">
          <table class="min-w-full divide-y divide-campo-100 text-sm">
            <thead class="bg-campo-50/70">
              <tr><th :class="classeTh">Setor</th><th :class="classeTh">Turno</th><th :class="classeTh">Pessoa</th><th :class="classeTh">Observação</th><th v-if="podeAdmin" :class="classeTh">Ações</th></tr>
            </thead>
            <tbody class="divide-y divide-campo-100">
              <template v-for="bloco in dia.setores" :key="bloco.setor.id">
                <template v-if="bloco.itens.length > 0">
                  <template v-for="grupo in itensPorTurno(bloco.itens)" :key="`${bloco.setor.id}-${grupo.turno}`">
                    <tr v-for="(item, idx) in grupo.itens" :key="item.id" class="hover:bg-campo-50/60">
                      <td v-if="idx === 0" :class="`${classeTd} font-semibold text-campo-900`" :rowspan="grupo.itens.length">{{ bloco.setor.nome }}<span class="block text-xs font-normal text-campo-500">{{ grupo.turno }}</span></td>
                      <td v-else class="hidden" />
                      <td :class="classeTd"><Badge tom="azul">{{ grupo.turno }}</Badge></td>
                      <td :class="classeTd">{{ item.pessoa ? `${item.pessoa.postoGraduacao ? item.pessoa.postoGraduacao + " " : ""}${item.pessoa.nome}` : `Efetivo #${item.efetivoId}` }}</td>
                      <td :class="classeTd">{{ item.observacao ?? "—" }}</td>
                      <td v-if="podeAdmin" :class="classeTd">
                        <button type="button" :class="classeBotaoSecundario" @click="remover(item.id)">Remover</button>
                      </td>
                    </tr>
                  </template>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </template>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #area-impressao, #area-impressao * {
    visibility: visible;
  }
  #area-impressao {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>
