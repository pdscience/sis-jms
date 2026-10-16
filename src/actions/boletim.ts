import { atualizar, inserir, porColuna, remover, um } from "@/db";
import type { Boletim } from "@/db/schema";
import { exigirPapel, exigirSessao, ipAtual } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { gradeSemana } from "@/server/efetivo";
import { montarEscalaBoletim } from "@/lib/boletim";
import type { ResultadoAcao } from "./auth.js";

function texto(fd: FormData, campo: string): string | null {
  const v = String(fd.get(campo) ?? "").trim();
  return v.length ? v : null;
}
function numero(fd: FormData, campo: string): number | null {
  const v = String(fd.get(campo) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function segundaValida(semana: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) return false;
  const [ano, mes, dia] = semana.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1
    && d.getUTCDate() === dia && d.getUTCDay() === 1;
}
const rotulo = (numero: number, ano: number) => `BI nº ${String(numero).padStart(3, "0")}/${ano}`;

export async function criarBoletim(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  const semana = texto(formData, "semana");
  if (!semana || !segundaValida(semana)) {
    return { ok: false, erro: "Informe uma segunda-feira válida (YYYY-MM-DD)." };
  }
  const ano = Number(semana.slice(0, 4));

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const doAno = await porColuna<Boletim>("boletins", "ano", ano);
    const proximo = doAno.reduce((m, b) => Math.max(m, b.numero), 0) + 1;
    try {
      const novo = await inserir<Boletim>("boletins", {
        numero: proximo, ano, semana, status: "rascunho",
        secao2: null, secao3: null, secao4: null, criadoPor: operador.id,
      });
      await registrarAuditoria(operador, {
        acao: "CRIAR_BOLETIM", entidade: "boletim", entidadeId: novo.id,
        resumo: `${rotulo(novo.numero, novo.ano)} criado (semana de ${semana})`,
        detalhes: { semana }, ip: await ipAtual(),
      });
      return { ok: true, sucesso: "Boletim criado como rascunho.", id: novo.id };
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      const conflito = msg.includes("unique") || msg.includes("duplicate")
        || msg.includes("23505") || msg.includes("already exists");
      if (!conflito || tentativa === 1) throw e;
    }
  }
  return { ok: false, erro: "Não foi possível numerar o boletim. Tente novamente." };
}

export async function salvarBoletim(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  const id = numero(formData, "id");
  if (!id) return { ok: false, erro: "Informe o boletim." };
  const boletim = await um<Boletim>("boletins", "id", id);
  if (!boletim) return { ok: false, erro: "Boletim não encontrado." };
  if (boletim.status === "publicado") return { ok: false, erro: "Boletim publicado é somente leitura." };

  const dados = {
    secao2: texto(formData, "secao2"),
    secao3: texto(formData, "secao3"),
    secao4: texto(formData, "secao4"),
    atualizadoEm: new Date(),
  };
  await atualizar<Boletim>("boletins", dados, "id", id);
  await registrarAuditoria(operador, {
    acao: "EDITAR_BOLETIM", entidade: "boletim", entidadeId: id,
    resumo: `${rotulo(boletim.numero, boletim.ano)} editado`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Boletim salvo." };
}

export async function publicarBoletim(id: number): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const boletim = await um<Boletim>("boletins", "id", id);
  if (!boletim) return { ok: false, erro: "Boletim não encontrado." };
  if (boletim.status === "publicado") return { ok: false, erro: "Boletim já publicado." };

  const semana = String(boletim.semana).slice(0, 10);
  const snapshot = montarEscalaBoletim(semana, await gradeSemana(semana));
  const agora = new Date();
  await atualizar<Boletim>("boletins", {
    status: "publicado", escalaSnapshot: snapshot,
    publicadoPor: operador.id, publicadoEm: agora, atualizadoEm: agora,
  }, "id", id);
  await registrarAuditoria(operador, {
    acao: "PUBLICAR_BOLETIM", entidade: "boletim", entidadeId: id,
    resumo: `${rotulo(boletim.numero, boletim.ano)} publicado`,
    detalhes: { semana }, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Boletim publicado." };
}

export async function excluirBoletim(id: number): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const boletim = await um<Boletim>("boletins", "id", id);
  if (!boletim) return { ok: false, erro: "Boletim não encontrado." };
  if (boletim.status === "publicado") return { ok: false, erro: "Boletim publicado não pode ser excluído." };
  try {
    await remover("boletins", "id", id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("nenhum registro")) return { ok: false, erro: "Boletim não encontrado." };
    throw e;
  }
  await registrarAuditoria(operador, {
    acao: "EXCLUIR_BOLETIM", entidade: "boletim", entidadeId: id,
    resumo: `${rotulo(boletim.numero, boletim.ano)} excluído`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Rascunho excluído." };
}
