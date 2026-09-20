import { atom, computed } from "nanostores";
import { persistentAtom, persistentBoolean, persistentMap } from "@nanostores/persistent";

/**
 * Estado de interface com Nanostores: mantém o módulo leve, sem provedores
 * globais de estado, e persiste preferências/rascunhos no navegador.
 */

/** Rascunho do formulário de parecer médico (não se perde ao recarregar). */
export const $rascunhoParecer = persistentMap<Record<string, string>>(
  "jis:rascunho-parecer",
  {},
);

export function definirCampoParecer(campo: string, valor: string) {
  $rascunhoParecer.setKey(campo, valor);
}

export function limparRascunhoParecer() {
  $rascunhoParecer.set({});
}

/** Dias de afastamento calculados a partir do período informado. */
export const $periodoConcedido = computed($rascunhoParecer, (r) => {
  const inicio = r.dataInicio;
  const fim = r.dataFim;
  if (!inicio || !fim) return 0;
  const d1 = new Date(`${inicio}T00:00:00`);
  const d2 = new Date(`${fim}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
  const dias = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
  return dias > 0 ? dias : 0;
});

/** Preferência de exibição de dados clínicos (perfis com acesso ao sigilo). */
export const $exibirDadosClinicos = persistentBoolean("jis:exibir-clinicos", true);

/** Densidade das tabelas administrativas. */
export const $densidadeTabela = persistentAtom<"confortavel" | "compacta">(
  "jis:densidade-tabela",
  "confortavel",
);

/** Busca livre compartilhada entre os filtros do navegador. */
export const $buscaLocal = atom("");

/** Contagem de itens destacados na fila do usuário logado. */
export const $destaqueFila = atom<{ pendentes: number; analise: number }>({
  pendentes: 0,
  analise: 0,
});
