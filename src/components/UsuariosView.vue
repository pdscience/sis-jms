<script setup lang="ts">
import { onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import FormularioUsuario from "./FormularioUsuario.vue";
import BotaoStatusUsuario from "./BotaoStatusUsuario.vue";
import { formatDataHora } from "../lib/datas.js";
import { PAPEL_LABEL, type Papel } from "../lib/dominio.js";
import { classeTd, classeTh } from "./ui.js";

const TOM_PAPEL: Record<string, "verde" | "ambar" | "azul" | "roxo"> = { admin: "roxo", medico: "verde", secretaria: "azul", pessoal: "ambar" };
const ESCOPO: Record<Papel, string> = {
  admin: "Acesso total: cadastro, pareceres, homologação, publicação em BG, auditoria e gestão de usuários.",
  medico: "Prontuário completo (CID, anamnese, exames), emissão de parecer, atas e homologação.",
  secretaria: "Cadastro de policiais militares, recepção e triagem de atestados, convocações e publicação de extratos.",
  pessoal: "Somente resultado administrativo: atas homologadas/publicadas e relatórios nominais, sem dados clínicos.",
};

const carregando = ref(true);
const erro = ref("");
const usuarios = ref<any[]>([]);
const meuId = ref<number | null>(null);

onMounted(async () => {
  try {
    const r = await fetch("/api/usuarios");
    const j = await r.json();
    if (j.ok) { usuarios.value = j.dados.usuarios; meuId.value = j.dados.meuId; }
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
    titulo="Usuários e perfis de acesso (RBAC)"
    descricao="Controle rígido de permissões entre equipe médica, Secretaria da Junta e Seção de Pessoal."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Usuários' }]"
  />

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando usuários…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <div v-else class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
    <Card titulo="Perfis cadastrados" :corpo="false">
      <div class="rolagem-fina overflow-x-auto">
        <table class="min-w-full divide-y divide-campo-100 text-sm">
          <thead class="bg-campo-50/70"><tr><th :class="classeTh">Usuário</th><th :class="classeTh">Perfil</th><th :class="classeTh">Identificação</th><th :class="classeTh">Último acesso</th><th :class="classeTh">Situação</th></tr></thead>
          <tbody class="divide-y divide-campo-100">
            <tr v-for="u in usuarios" :key="u.id" class="hover:bg-campo-50/60">
              <td :class="classeTd"><span class="font-semibold text-campo-900">{{ u.nome }}</span><span class="block font-mono text-xs text-campo-500">{{ u.login }}</span></td>
              <td :class="classeTd"><Badge :tom="TOM_PAPEL[u.papel] ?? 'neutro'">{{ PAPEL_LABEL[u.papel as Papel] ?? u.papel }}</Badge></td>
              <td :class="`${classeTd} text-xs`">{{ u.posto ? `${u.posto} · ` : "" }}{{ u.crm ?? "—" }}<span class="block text-campo-500">{{ u.especialidade ?? "" }}</span></td>
              <td :class="`${classeTd} text-xs tabular-nums`">{{ formatDataHora(u.ultimoAcesso) }}</td>
              <td :class="classeTd">
                <div class="flex items-center gap-2">
                  <Badge :tom="u.ativo ? 'verde' : 'neutro'">{{ u.ativo ? "ativo" : "inativo" }}</Badge>
                  <BotaoStatusUsuario :usuario-id="u.id" :ativo="u.ativo" :proprio="u.id === meuId" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <div class="space-y-6">
      <Card titulo="Novo usuário"><FormularioUsuario /></Card>
      <Card titulo="Escopo de cada perfil">
        <ul class="space-y-3 text-sm">
          <li v-for="papel in (Object.keys(ESCOPO) as Papel[])" :key="papel" class="rounded-lg border border-campo-200 p-3">
            <div class="flex items-center gap-2"><Badge :tom="TOM_PAPEL[papel]">{{ papel }}</Badge><span class="font-semibold text-campo-900">{{ PAPEL_LABEL[papel] }}</span></div>
            <p class="mt-1 text-campo-600">{{ ESCOPO[papel] }}</p>
          </li>
        </ul>
      </Card>
    </div>
  </div>
</template>
