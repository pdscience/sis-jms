import { all, um } from "@/db";
import type { Boletim } from "@/db/schema";
import { exigirSessao } from "@/lib/auth";
import { gradeSemana } from "@/server/efetivo";
import { montarEscalaBoletim, type EscalaBoletim } from "@/lib/boletim";

const iso = (v: unknown) => String(v).slice(0, 10);

export async function carregarBoletins(
  filtros: { ano?: string; status?: string; busca?: string } = {},
): Promise<Boletim[]> {
  await exigirSessao();
  const boletins = await all<Boletim>("boletins", { order: { coluna: "criadoEm", asc: false } });
  const termo = (filtros.busca ?? "").trim().toLowerCase();
  return boletins.filter((b) => {
    if (filtros.ano && filtros.ano !== "todos" && String(b.ano) !== filtros.ano) return false;
    if (filtros.status && filtros.status !== "todos" && b.status !== filtros.status) return false;
    if (termo && !`${b.numero}/${b.ano} ${iso(b.semana)}`.toLowerCase().includes(termo)) return false;
    return true;
  });
}

export async function escalaEfetiva(boletim: Boletim): Promise<EscalaBoletim> {
  if (boletim.status === "publicado" && boletim.escalaSnapshot) {
    return boletim.escalaSnapshot as EscalaBoletim;
  }
  const semana = iso(boletim.semana);
  const grade = await gradeSemana(semana);
  return montarEscalaBoletim(semana, grade);
}

export async function detalheBoletim(
  id: number,
): Promise<{ boletim: Boletim; escala: EscalaBoletim } | null> {
  await exigirSessao();
  const boletim = await um<Boletim>("boletins", "id", id);
  if (!boletim) return null;
  return { boletim, escala: await escalaEfetiva(boletim) };
}
