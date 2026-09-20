<script setup lang="ts">
import { ref } from "vue";

const PERFIS_DEMO = [
  { login: "presidente", rotulo: "Presidente da Junta", detalhe: "Acesso total (homologação, BG, auditoria)" },
  { login: "medico", rotulo: "Médico avaliador", detalhe: "Prontuário completo e pareceres" },
  { login: "secretaria", rotulo: "Secretaria da Junta", detalhe: "Atestados, cadastros e convocações" },
  { login: "pessoal", rotulo: "Seção de Pessoal (P1)", detalhe: "Somente resultado final e atas" },
];

const erro = ref("");
const pendente = ref(false);
const login = ref("");
const senha = ref("");

function preencher(l: string) {
  login.value = l;
  senha.value = "jis123";
}

async function onSubmit() {
  erro.value = "";
  pendente.value = true;
  try {
    const fd = new FormData();
    fd.set("login", login.value);
    fd.set("senha", senha.value);
    const r = await fetch("/api/auth/entrar", { method: "POST", body: fd });
    const j = await r.json();
    if (j.ok) window.location.href = "/painel";
    else erro.value = j.erro ?? "Falha no login.";
  } catch {
    erro.value = "Falha de rede ao autenticar.";
  } finally {
    pendente.value = false;
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <div class="flex items-center gap-3">
      <span class="grid h-11 w-11 place-items-center rounded-xl bg-campo-800 text-ouro-300">✚</span>
      <div>
        <p class="text-sm font-semibold text-campo-900">Acesso restrito</p>
        <p class="text-xs text-campo-500">Autenticação por perfil (RBAC)</p>
      </div>
    </div>

    <p v-if="erro" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ erro }}</p>

    <label class="block">
      <span class="mb-1 block text-sm font-semibold text-campo-800">Login (identidade funcional) *</span>
      <input v-model="login" name="login" class="w-full rounded-lg border border-campo-300 px-3 py-2 text-sm" placeholder="ex.: presidente" autocomplete="username" required />
    </label>

    <label class="block">
      <span class="mb-1 block text-sm font-semibold text-campo-800">Senha *</span>
      <input v-model="senha" name="senha" type="password" class="w-full rounded-lg border border-campo-300 px-3 py-2 text-sm" placeholder="••••••" autocomplete="current-password" required />
    </label>

    <button type="submit" :disabled="pendente" class="w-full rounded-lg bg-campo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-campo-800 disabled:opacity-60">
      {{ pendente ? "Autenticando..." : "Entrar no SIS-JIS" }}
    </button>

    <div class="rounded-xl border border-campo-200 bg-campo-50 p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-campo-600">
        Perfis de demonstração · senha <span class="font-mono">jis123</span>
      </p>
      <div class="mt-3 grid gap-2 sm:grid-cols-2">
        <button v-for="perfil in PERFIS_DEMO" :key="perfil.login" type="button" class="rounded-lg border border-campo-200 bg-white px-3 py-2 text-left transition hover:border-campo-500" @click="preencher(perfil.login)">
          <span class="block text-sm font-semibold text-campo-900">{{ perfil.rotulo }}</span>
          <span class="block text-xs text-campo-500">{{ perfil.detalhe }}</span>
          <span class="mt-1 block font-mono text-[11px] text-campo-400">{{ perfil.login }}</span>
        </button>
      </div>
    </div>
  </form>
</template>
