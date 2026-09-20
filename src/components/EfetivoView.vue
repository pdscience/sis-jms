<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import FormularioEfetivo, { type DadosEfetivo } from "./FormularioEfetivo.vue";
import {
  classeBotaoPrimario, classeBotaoSecundario, classeInput, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ busca?: string }>();

type Pessoa = {
  id: number; militarId: number | null; nome: string;
  postoGraduacao: string | null; funcao: string | null;
  telefone: string | null; ativo: boolean;
};

const carregando = ref(true);
const erro = ref("");
const pessoas = ref<Pessoa[]>([]);
const papel = ref("");
const buscaAtual = ref(props.busca ?? "");
const mostrandoForm = ref(false);
const editando = ref<DadosEfetivo | null>(null);
const acaoMsg = ref("");
const acaoErro = ref("");

const podeAdmin = computed(() => papel.value === "admin");

async function carregar() {
  carregando.value = true;
  erro.value = "";
  try {
    const q = new URLSearchParams({ busca: props.busca ?? "" });
    const r = await fetch(`/api/efetivo?${q}`);
    const j = await r.json();
    if (j.ok) {
      pessoas.value = j.dados.pessoas ?? [];
    } else {
      erro.value = j.erro ?? "Falha ao listar.";
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

function novo() {
  editando.value = null;
  mostrandoForm.value = true;
}

function editar(p: Pessoa) {
  editando.value = {
    id: p.id, militarId: p.militarId, nome: p.nome,
    postoGraduacao: p.postoGraduacao, funcao: p.funcao,
    telefone: p.telefone, ativo: p.ativo,
  };
  mostrandoForm.value = true;
}

function aposSalvar() {
  mostrandoForm.value = false;
  editando.value = null;
  carregar();
}

async function alternar(p: Pessoa) {
  acaoMsg.value = ""; acaoErro.value = "";
  try {
    const r = await fetch("/api/efetivo?acao=status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, ativo: !p.ativo }),
    });
    const j = await r.json();
    if (j.ok) {
      acaoMsg.value = j.sucesso ?? "Situação atualizada.";
      await carregar();
    } else {
      acaoErro.value = j.erro ?? "Falha ao atualizar situação.";
    }
  } catch {
    acaoErro.value = "Falha de rede.";
  }
}
</script>

<template>
  <CabecalhoPagina
    titulo="Efetivo da Junta de Inspeção de Saúde"
    descricao="Pessoas vinculadas ao serviço da Junta: policiais militares vinculados ao cadastro ou colaboradores avulsos."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Efetivo' }]"
  >
    <template #acoes>
      <button v-if="podeAdmin && !mostrandoForm" type="button" :class="classeBotaoPrimario" @click="novo"><Icone nome="mais" className="h-4 w-4" /> Novo registro</button>
    </template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando efetivo…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <template v-else>
    <Aviso v-if="acaoErro" tom="vermelho">{{ acaoErro }}</Aviso>
    <Aviso v-if="acaoMsg" tom="verde">{{ acaoMsg }}</Aviso>

    <Card v-if="mostrandoForm" titulo="Registro do efetivo" :descricao="editando?.id ? 'Edite os dados do registro.' : 'Inclua uma pessoa no efetivo da Junta.'" className="mb-5">
      <FormularioEfetivo :inicial="editando ?? undefined" @salvo="aposSalvar" />
      <div class="mt-4">
        <button type="button" :class="classeBotaoSecundario" @click="mostrandoForm = false; editando = null">Cancelar</button>
      </div>
    </Card>

    <Card :corpo="false">
      <form method="get" action="/efetivo" class="flex flex-wrap items-end gap-3 border-b border-campo-100 p-4">
        <div class="min-w-[220px] flex-1">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Busca</span>
          <div class="relative">
            <span class="pointer-events-none absolute left-3 top-2.5 text-campo-400"><Icone nome="busca" /></span>
            <input name="busca" v-model="buscaAtual" :class="`${classeInput} pl-9`" placeholder="Nome, posto ou função" />
          </div>
        </div>
        <button type="submit" :class="classeBotaoPrimario">Filtrar</button>
        <a v-if="(props.busca ?? '') !== ''" href="/efetivo" class="rounded-lg px-3 py-2 text-sm font-semibold text-campo-600 hover:text-campo-900">Limpar</a>
      </form>

      <div v-if="pessoas.length === 0" class="p-5"><Vazio titulo="Nenhum registro no efetivo" descricao="Ajuste a busca ou inclua um novo registro no efetivo da Junta." /></div>
      <div v-else class="rolagem-fina overflow-x-auto">
        <table class="min-w-full divide-y divide-campo-100 text-sm">
          <thead class="bg-campo-50/70">
            <tr><th :class="classeTh">Nome</th><th :class="classeTh">Posto/Graduação</th><th :class="classeTh">Função</th><th :class="classeTh">Origem</th><th :class="classeTh">Situação</th><th v-if="podeAdmin" :class="classeTh">Ações</th></tr>
          </thead>
          <tbody class="divide-y divide-campo-100">
            <tr v-for="p in pessoas" :key="p.id" class="hover:bg-campo-50/60">
              <td :class="`${classeTd} font-semibold text-campo-900`">{{ p.nome }}</td>
              <td :class="classeTd">{{ p.postoGraduacao ?? "—" }}</td>
              <td :class="classeTd">{{ p.funcao ?? "—" }}</td>
              <td :class="classeTd">
                <Badge v-if="p.militarId" tom="azul">Vinculado #{{ p.militarId }}</Badge>
                <Badge v-else tom="neutro">Avulso</Badge>
              </td>
              <td :class="classeTd">
                <Badge :tom="p.ativo ? 'verde' : 'neutro'">{{ p.ativo ? "Ativo" : "Inativo" }}</Badge>
              </td>
              <td v-if="podeAdmin" :class="classeTd">
                <div class="flex flex-wrap gap-2">
                  <button type="button" :class="classeBotaoSecundario" @click="editar(p)">Editar</button>
                  <button type="button" :class="classeBotaoSecundario" @click="alternar(p)">{{ p.ativo ? "Desativar" : "Ativar" }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
    <p class="mt-3 text-xs text-campo-500">{{ pessoas.length }} registro(s) listado(s). Inclusão, edição e ativação/desativação exigem perfil administrador; a leitura é aberta a todos os papéis logados.</p>
  </template>
</template>
