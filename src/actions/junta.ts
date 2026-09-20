import { all, atualizar, contar, inserir, porColuna, um } from "@/db";
import type { Afastamento, Atestado, Convocacao, Inspecao, Militar } from "@/db/schema";
import { exigirPapel, ipAtual } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { addDias, diffDias, hoje } from "@/lib/datas";
import { ANTECEDENCIA_REAVALIACAO, LIMITE_AGREGACAO_DIAS, PARECER_LABEL, type Parecer } from "@/lib/dominio";
import type { ResultadoAcao } from "./auth.js";

function txt(formData: FormData, campo: string): string | null {
  const valor = String(formData.get(campo) ?? "").trim();
  return valor.length ? valor : null;
}

async function gerarAtaNumero(om: string): Promise<string> {
  const ano = new Date().getFullYear();
  const total = await contar("inspecoes");
  const sigla = om.replace(/[^\w\s]/g, "").split(/\s+/).filter((p) => p.length > 2).slice(0, 3).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return `ATA Nº ${String(total + 1).padStart(4, "0")}/${ano} - JIS/${sigla || "OM"}`;
}

export async function registrarParecer(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirPapel("medico", "admin");

  const militarId = Number(formData.get("militarId"));
  const atestadoId = Number(formData.get("atestadoId") ?? 0) || null;
  const parecer = String(formData.get("parecer") ?? "") as Parecer;
  if (!Number.isFinite(militarId) || !PARECER_LABEL[parecer]) {
    return { ok: false, erro: "Selecione o policial militar e o parecer oficial." };
  }
  const militar = await um<Militar>("militares", "id", militarId);
  if (!militar) return { ok: false, erro: "Policial militar não encontrado." };

  const dataInicio = txt(formData, "dataInicio") ?? hoje();
  let diasAfastamento = Number(formData.get("diasAfastamento") ?? 0) || 0;
  let dataFim = txt(formData, "dataFim");
  if (diasAfastamento <= 0 && dataFim) diasAfastamento = Math.max(diffDias(dataInicio, dataFim) + 1, 0);
  if (diasAfastamento > 0 && !dataFim) dataFim = addDias(dataInicio, diasAfastamento - 1);
  if (diasAfastamento <= 0) dataFim = null;
  const enquadramentoLegal = txt(formData, "enquadramentoLegal");

  if ((parecer === "inapto_temporario" || parecer === "necessita_lts" || parecer === "agregacao") && diasAfastamento <= 0) {
    return { ok: false, erro: "Para parecer de incapacidade temporária informe o período concedido em dias." };
  }
  if ((parecer === "inapto_temporario" || parecer === "necessita_lts") && !enquadramentoLegal) {
    return { ok: false, erro: "Selecione o enquadramento legal do afastamento." };
  }

  const restringeAtividade = formData.get("restringeAtividade") === "on";
  const restricoes = String(formData.get("restricoesLista") ?? "").split("|").map((r) => r.trim()).filter(Boolean);
  const necessitaReavaliacao = formData.get("necessitaReavaliacao") === "on";
  const dataReavaliacao = txt(formData, "dataReavaliacao") ?? (dataFim ? addDias(dataFim, -ANTECEDENCIA_REAVALIACAO) : null);

  const afastAnteriores = await porColuna<Afastamento>("afastamentos", "militarId", militarId);
  const acumulado = afastAnteriores.reduce((s, a) => s + (a.dias ?? 0), 0) + diasAfastamento;

  const ataNumero = await gerarAtaNumero(militar.om);
  const inspecao = await inserir<Inspecao>("inspecoes", {
    ataNumero, militarId, atestadoId, medicoId: operador.id,
    tipo: (txt(formData, "tipo") ?? "inicial") as "inicial",
    dataInspecao: txt(formData, "dataInspecao") ?? hoje(),
    parecer, cid: txt(formData, "cid"), enquadramentoLegal,
    diasAfastamento, dataInicio: diasAfastamento > 0 ? dataInicio : null, dataFim,
    restringeAtividade, descricaoClinica: txt(formData, "descricaoClinica"),
    examesRealizados: txt(formData, "examesRealizados"),
    recomendacoes: [txt(formData, "recomendacoes"), ...restricoes].filter(Boolean).join("\n") || null,
    necessitaReavaliacao, dataReavaliacao: necessitaReavaliacao ? dataReavaliacao : null,
    status: "emitida", criadoPor: operador.id,
  });

  if (diasAfastamento > 0) {
    const vigentes = (await porColuna<Afastamento>("afastamentos", "militarId", militarId)).filter((a) => a.situacao === "vigente");
    for (const v of vigentes) await atualizar("afastamentos", { situacao: "prorrogado" }, "id", v.id);
    const tipo = parecer === "agregacao" || acumulado >= LIMITE_AGREGACAO_DIAS ? "agregacao"
      : parecer === "necessita_lts" ? "lts"
      : parecer === "apto_com_restricao" ? "dispensa_atividade" : "tratamento_saude";
    await inserir("afastamentos", {
      militarId, inspecaoId: inspecao.id, tipo, dataInicio,
      dataFim: dataFim ?? dataInicio, dias: diasAfastamento, situacao: "vigente",
      agregadoDesde: acumulado >= LIMITE_AGREGACAO_DIAS || parecer === "agregacao" ? dataInicio : null,
      observacoes: `Acumulado em 12 meses: ${acumulado} dia(s).`,
    });
  }

  if (atestadoId) {
    const homologado = parecer !== "apto" || diasAfastamento > 0;
    await atualizar("atestados", {
      status: homologado ? "homologado" : "nao_homologado",
      inspecaoId: inspecao.id,
      justificativa: `Parecer: ${PARECER_LABEL[parecer]} — ${inspecao.ataNumero}`,
      atualizadoEm: new Date(),
    }, "id", atestadoId);
  }

  const situacao = parecer === "reforma" || parecer === "inapto_definitivo" ? "reformado"
    : parecer === "agregacao" || acumulado >= LIMITE_AGREGACAO_DIAS ? "agregado" : "ativo";
  if (situacao !== militar.situacao) {
    await atualizar("militares", { situacao, atualizadoEm: new Date() }, "id", militarId);
  }

  if (necessitaReavaliacao) {
    await inserir("convocacoes", {
      militarId, inspecaoId: inspecao.id,
      motivo: `Reavaliação após ${PARECER_LABEL[parecer]} — ${inspecao.ataNumero}`,
      emitidaEm: hoje(), dataLimite: dataReavaliacao ?? addDias(hoje(), 30),
      canal: "Boletim Geral / Contato telefônico", status: "pendente", criadoPor: operador.id,
    });
  }

  await registrarAuditoria(operador, {
    acao: "REGISTRAR_PARECER", entidade: "inspecao", entidadeId: inspecao.id,
    resumo: `${inspecao.ataNumero} — ${PARECER_LABEL[parecer]} (${diasAfastamento} dia(s)) para ${militar.nome}`,
    detalhes: { militarId, atestadoId, parecer, cid: inspecao.cid, diasAfastamento, dataInicio, dataFim, acumulado, enquadramentoLegal },
    ip: await ipAtual(),
  });

  return { ok: true, sucesso: `Parecer registrado. ${inspecao.ataNumero} gerada.`, id: inspecao.id };
}

export async function homologarAta(inspecaoId: number): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin", "medico");
  const ata = await um<Inspecao>("inspecoes", "id", inspecaoId);
  if (!ata) return { ok: false, erro: "Ata não encontrada." };
  if (ata.status === "homologada" || ata.status === "publicada") return { ok: false, erro: "Ata já homologada." };

  await atualizar("inspecoes", { status: "homologada", homologadoPor: operador.id, homologadoEm: new Date(), atualizadoEm: new Date() }, "id", inspecaoId);
  if (ata.atestadoId) {
    await atualizar("atestados", { status: "homologado", atualizadoEm: new Date() }, "id", ata.atestadoId);
  }
  await registrarAuditoria(operador, {
    acao: "HOMOLOGAR_ATA", entidade: "inspecao", entidadeId: inspecaoId,
    resumo: `Ata ${ata.ataNumero} homologada`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Ata homologada." };
}

export async function publicarAta(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin", "secretaria");
  const inspecaoId = Number(formData.get("inspecaoId"));
  const biNumero = String(formData.get("biNumero") ?? "").trim() || `BG nº ${hoje()}`;
  const publicadas = await atualizar<Inspecao>("inspecoes", { status: "publicada", biNumero, publicadoEm: new Date(), atualizadoEm: new Date() }, "id", inspecaoId);
  const ata = publicadas[0];
  if (!ata) return { ok: false, erro: "Ata não encontrada." };
  await registrarAuditoria(operador, {
    acao: "PUBLICAR_BI", entidade: "inspecao", entidadeId: inspecaoId,
    resumo: `Extrato da ${ata.ataNumero} publicado em ${biNumero}`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: `Extrato publicado em ${biNumero}.` };
}

export async function anularAta(inspecaoId: number, motivo: string): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  if (!motivo.trim()) return { ok: false, erro: "Informe o motivo da anulação." };
  const anuladas = await atualizar<Inspecao>("inspecoes", { status: "rascunho", atualizadoEm: new Date() }, "id", inspecaoId);
  const ata = anuladas[0];
  if (!ata) return { ok: false, erro: "Ata não encontrada." };
  await registrarAuditoria(operador, {
    acao: "ANULAR_ATA", entidade: "inspecao", entidadeId: inspecaoId,
    resumo: `Ata ${ata.ataNumero} anulada: ${motivo}`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Ata anulada e devolvida para revisão." };
}
