import { atualizar, inserir, remover, um } from "@/db";
import type { Efetivo, Escala, Militar, Setor } from "@/db/schema";
import { exigirPapel, ipAtual } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import type { ResultadoAcao } from "./auth.js";

function texto(fd: FormData, campo: string): string | null {
  const valor = String(fd.get(campo) ?? "").trim();
  return valor.length ? valor : null;
}

function numero(fd: FormData, campo: string): number | null {
  const bruto = String(fd.get(campo) ?? "").trim();
  if (!bruto) return null;
  const n = Number(bruto);
  return Number.isFinite(n) ? n : null;
}

export async function salvarEfetivo(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const id = texto(formData, "id");

  let nome = texto(formData, "nome");
  let postoGraduacao = texto(formData, "postoGraduacao");
  const militarId = numero(formData, "militarId");
  if (militarId && militarId > 0) {
    const militar = await um<Militar>("militares", "id", militarId);
    if (militar) {
      nome = militar.nome;
      postoGraduacao = militar.postoGraduacao;
    }
  }
  if (!nome) return { ok: false, erro: "Nome é obrigatório." };

  const dados = {
    militarId: militarId && militarId > 0 ? militarId : null,
    nome,
    postoGraduacao,
    funcao: texto(formData, "funcao"),
    telefone: texto(formData, "telefone"),
  };

  if (id) {
    const atualizados = await atualizar<Efetivo>(
      "efetivo",
      { ...dados, atualizadoEm: new Date() },
      "id",
      Number(id),
    );
    const atualizado = atualizados[0];
    if (!atualizado) return { ok: false, erro: "Registro do efetivo não encontrado." };
    await registrarAuditoria(operador, {
      acao: "EDITAR_EFETIVO", entidade: "efetivo", entidadeId: atualizado.id,
      resumo: `Efetivo de ${atualizado.nome} atualizado`,
      detalhes: dados, ip: await ipAtual(),
    });
    return { ok: true, sucesso: "Registro atualizado com sucesso.", id: atualizado.id };
  }

  const novo = await inserir<Efetivo>("efetivo", dados);
  await registrarAuditoria(operador, {
    acao: "CADASTRAR_EFETIVO", entidade: "efetivo", entidadeId: novo.id,
    resumo: `${novo.nome} incluído no efetivo`,
    detalhes: dados, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Registro incluído no efetivo.", id: novo.id };
}

export async function statusEfetivo(id: number, ativo: boolean): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const atualizados = await atualizar<Efetivo>(
    "efetivo",
    { ativo, atualizadoEm: new Date() },
    "id",
    id,
  );
  const atualizado = atualizados[0];
  if (!atualizado) return { ok: false, erro: "Registro do efetivo não encontrado." };
  await registrarAuditoria(operador, {
    acao: ativo ? "ATIVAR_EFETIVO" : "DESATIVAR_EFETIVO",
    entidade: "efetivo", entidadeId: id,
    resumo: `${atualizado.nome} ${ativo ? "ativado" : "desativado"} no efetivo`,
    ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Situação atualizada." };
}

export async function salvarSetor(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const id = texto(formData, "id");
  const nome = texto(formData, "nome");
  if (!nome) return { ok: false, erro: "Nome do setor é obrigatório." };
  const dados = { nome, descricao: texto(formData, "descricao") };

  if (id) {
    const atualizados = await atualizar<Setor>("setores", dados, "id", Number(id));
    const atualizado = atualizados[0];
    if (!atualizado) return { ok: false, erro: "Setor não encontrado." };
    await registrarAuditoria(operador, {
      acao: "EDITAR_SETOR", entidade: "setor", entidadeId: atualizado.id,
      resumo: `Setor ${atualizado.nome} atualizado`,
      detalhes: dados, ip: await ipAtual(),
    });
    return { ok: true, sucesso: "Setor atualizado.", id: atualizado.id };
  }

  const novo = await inserir<Setor>("setores", dados);
  await registrarAuditoria(operador, {
    acao: "CRIAR_SETOR", entidade: "setor", entidadeId: novo.id,
    resumo: `Setor ${novo.nome} criado`,
    detalhes: dados, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Setor criado.", id: novo.id };
}

export async function statusSetor(id: number, ativo: boolean): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const atualizados = await atualizar<Setor>("setores", { ativo }, "id", id);
  const atualizado = atualizados[0];
  if (!atualizado) return { ok: false, erro: "Setor não encontrado." };
  await registrarAuditoria(operador, {
    acao: ativo ? "ATIVAR_SETOR" : "DESATIVAR_SETOR",
    entidade: "setor", entidadeId: id,
    resumo: `Setor ${atualizado.nome} ${ativo ? "ativado" : "desativado"}`,
    ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Situação do setor atualizada." };
}

export async function adicionarEscala(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const semana = texto(formData, "semana");
  const dia = numero(formData, "dia");
  const turno = texto(formData, "turno");
  const setorId = numero(formData, "setorId");
  const efetivoId = numero(formData, "efetivoId");
  const observacao = texto(formData, "observacao");

  if (!semana || dia === null || !turno || !setorId || !efetivoId) {
    return { ok: false, erro: "Informe semana, dia, turno, setor e pessoa." };
  }
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
    return { ok: false, erro: "Dia inválido (0 a 6, segunda a domingo)." };
  }

  try {
    const nova = await inserir<Escala>("escalas", {
      semana, dia, turno, setorId, efetivoId, observacao, criadoPor: operador.id,
    });
    await registrarAuditoria(operador, {
      acao: "ADICIONAR_ESCALA", entidade: "escala", entidadeId: nova.id,
      resumo: `Plantão ${turno} (${semana}) adicionado`,
      detalhes: { semana, dia, turno, setorId, efetivoId }, ip: await ipAtual(),
    });
    return { ok: true, sucesso: "Plantão adicionado.", id: nova.id };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505") || msg.includes("already exists")) {
      return { ok: false, erro: "Plantão já existe." };
    }
    throw e;
  }
}

export async function removerEscala(id: number): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  try {
    await remover("escalas", "id", id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("nenhum registro")) return { ok: false, erro: "Escala não encontrada." };
    throw e;
  }
  await registrarAuditoria(operador, {
    acao: "REMOVER_ESCALA", entidade: "escala", entidadeId: id,
    resumo: `Plantão #${id} removido da escala`,
    ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Plantão removido." };
}
