import { all, porColuna } from "@/db";
import type { Efetivo, Escala, Militar, Setor } from "@/db/schema";
import { ensureSetores } from "@/lib/seed";
import { exigirSessao } from "@/lib/auth";

export async function carregarEfetivo(busca = "") {
  await exigirSessao();
  await ensureSetores();
  const [pessoas, setores] = await Promise.all([all<Efetivo>("efetivo"), all<Setor>("setores")]);
  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? pessoas.filter((p) => [p.nome, p.postoGraduacao, p.funcao].filter(Boolean).some((c) => c!.toLowerCase().includes(termo)))
    : pessoas;
  return { pessoas: filtradas, setores };
}

export async function gradeSemana(semanaISO: string) {
  await exigirSessao();
  await ensureSetores();
  const [escalas, setores, pessoas] = await Promise.all([
    porColuna<Escala>("escalas", "semana", semanaISO),
    all<Setor>("setores"),
    all<Efetivo>("efetivo"),
  ]);
  const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const dias = DIAS.map((rotulo, dia) => ({
    dia, rotulo,
    setores: setores.filter((s) => s.ativo).map((setor) => ({
      setor,
      itens: escalas
        .filter((e) => e.dia === dia && e.setorId === setor.id)
        .map((e) => ({ ...e, pessoa: pessoas.find((p) => p.id === e.efetivoId) ?? null })),
    })),
  }));
  return { dias, setores: setores.filter((s) => s.ativo), pessoas: pessoas.filter((p) => p.ativo) };
}
