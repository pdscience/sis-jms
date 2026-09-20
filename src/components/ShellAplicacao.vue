<script setup lang="ts">
import { ref } from "vue";
import Sidebar, { type UsuarioSessao } from "./Sidebar.vue";
import BarraSuperior from "./BarraSuperior.vue";

defineProps<{ usuario: UsuarioSessao; contadores?: { rotulo: string; valor: number }[]; caminho?: string }>();
const menuAberto = ref(false);
</script>

<template>
  <div class="min-h-screen bg-campo-50">
    <Sidebar :usuario="usuario" :aberto="menuAberto" :caminho="caminho" @fechar="menuAberto = false" />
    <div class="lg:pl-72">
      <BarraSuperior :usuario="usuario" :contadores="contadores" @abrir-menu="menuAberto = true" />
      <main class="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8"><slot /></main>
      <footer class="mx-auto w-full max-w-[1400px] px-4 pb-8 text-xs text-campo-500 lg:px-8">
        SIS-JMS · MVP da Junta Médica de Saúde — dados clínicos protegidos por sigilo médico e trilha de auditoria imutável.
      </footer>
    </div>
  </div>
</template>
