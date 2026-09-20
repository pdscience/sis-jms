import { atualizar, inserir, porColuna } from "@/db";
import type { Militar } from "@/db/schema";
import { exigirPapel, exigirSessao, ipAtual } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import type { ResultadoAcao } from "./auth.js";

function texto(fd: FormData, campo: string): string | null {
  const valor = String(fd.get(campo) ?? "").trim();
  return valor.length ? valor : null;
}

export async function salvarMilitar(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  const id = texto(formData, "id");

  const re = texto(formData, "re");
  const nome = texto(formData, "nome");
  const postoGraduacao = texto(formData, "postoGraduacao");
  const om = texto(formData, "om");

  if (!re || !nome || !postoGraduacao || !om) {
    return { ok: false, erro: "RE, nome completo, posto/graduação e OM são obrigatórios." };
  }

  const dados = {
    re, nome, postoGraduacao, om,
    cpf: texto(formData, "cpf"),
    nomeGuerra: texto(formData, "nomeGuerra"),
    quadro: texto(formData, "quadro"),
    funcao: texto(formData, "funcao"),
    dataNascimento: texto(formData, "dataNascimento"),
    sexo: texto(formData, "sexo"),
    tipoSanguineo: texto(formData, "tipoSanguineo"),
    telefone: texto(formData, "telefone"),
    email: texto(formData, "email"),
    dataInclusao: texto(formData, "dataInclusao"),
    situacao: (texto(formData, "situacao") ?? "ativo") as "ativo",
    observacoes: texto(formData, "observacoes"),
  };

  if (id) {
    await exigirPapel("secretaria", "admin");
    const atualizados = await atualizar<Militar>(
      "militares",
      { ...dados, atualizadoEm: new Date() },
      "id",
      Number(id),
    );
    const atualizado = atualizados[0];
    if (!atualizado) return { ok: false, erro: "Policial militar não encontrado." };
    await registrarAuditoria(operador, {
      acao: "EDITAR_MILITAR", entidade: "militar", entidadeId: atualizado.id,
      resumo: `Cadastro de ${atualizado.nome} (${atualizado.re}) atualizado`,
      detalhes: dados, ip: await ipAtual(),
    });
    return { ok: true, sucesso: "Cadastro atualizado com sucesso.", id: atualizado.id };
  }

  await exigirPapel("secretaria", "medico", "admin");
  const duplicado = await porColuna<{ id: number }>("militares", "re", dados.re);
  if (duplicado.length) {
    return { ok: false, erro: `Já existe policial militar cadastrado com o RE ${dados.re}.` };
  }

  const novo = await inserir<Militar>("militares", { ...dados, criadoPor: operador.id });
  await registrarAuditoria(operador, {
    acao: "CADASTRAR_MILITAR", entidade: "militar", entidadeId: novo.id,
    resumo: `${novo.postoGraduacao} ${novo.nome} (${novo.re}) cadastrado`,
    detalhes: dados, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Policial militar cadastrado com sucesso.", id: novo.id };
}

export async function alterarSituacao(militarId: number, situacao: string): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  await exigirPapel("secretaria", "admin");
  const atualizados = await atualizar<Militar>(
    "militares",
    { situacao, atualizadoEm: new Date() },
    "id",
    militarId,
  );
  const atualizado = atualizados[0];
  if (!atualizado) return { ok: false, erro: "Policial militar não encontrado." };
  await registrarAuditoria(operador, {
    acao: "ALTERAR_SITUACAO", entidade: "militar", entidadeId: militarId,
    resumo: `Situação de ${atualizado.nome} alterada para ${situacao}`,
    ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Situação atualizada." };
}
