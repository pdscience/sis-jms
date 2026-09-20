import { all, atualizar, inserir, porColuna, um } from "@/db";
import type { Afastamento, Convocacao, Inspecao, Militar } from "@/db/schema";
import { exigirPapel, ipAtual } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { addDias, hoje } from "@/lib/datas";
import { calcularPrazos } from "@/lib/prazos";
import type { ResultadoAcao } from "./auth.js";

export async function convocarReavaliacao(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirPapel("secretaria", "medico", "admin");
  const militarId = Number(formData.get("militarId"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  const dataLimite = String(formData.get("dataLimite") ?? addDias(hoje(), 15));
  const canal = String(formData.get("canal") ?? "Boletim Geral");

  if (!Number.isFinite(militarId) || !motivo) {
    return { ok: false, erro: "Informe o policial militar e o motivo da convocação." };
  }
  const militar = await um<Militar>("militares", "id", militarId);
  if (!militar) return { ok: false, erro: "Policial militar não encontrado." };

  const nova = await inserir<Convocacao>("convocacoes", {
    militarId,
    inspecaoId: Number(formData.get("inspecaoId") ?? 0) || null,
    motivo, emitidaEm: hoje(), dataLimite, canal, status: "pendente", criadoPor: operador.id,
  });

  await registrarAuditoria(operador, {
    acao: "EMITIR_CONVOCACAO", entidade: "convocacao", entidadeId: nova.id,
    resumo: `${militar.nome} (${militar.re}) convocado até ${dataLimite}: ${motivo}`,
    detalhes: { canal, dataLimite }, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Convocação emitida.", id: nova.id };
}

export async function gerarConvocacoesAutomaticas(): Promise<ResultadoAcao> {
  const operador = await exigirPapel("secretaria", "medico", "admin");
  const [listaMilitares, listaAfastamentos, listaInspecoes, listaConvocacoes] = await Promise.all([
    all<Militar>("militares"),
    all<Afastamento>("afastamentos"),
    all<Inspecao>("inspecoes"),
    all<Convocacao>("convocacoes"),
  ]);
  const resumos = calcularPrazos({
    militares: listaMilitares, afastamentos: listaAfastamentos,
    inspecoes: listaInspecoes, convocacoes: listaConvocacoes,
  }).filter((r) => r.reavaliacaoNecessaria);

  let criadas = 0;
  for (const resumo of resumos) {
    const motivo = resumo.diasRestantes < 0
      ? `Afastamento vencido em ${resumo.dataFim} — comparecimento obrigatório para nova inspeção`
      : `Afastamento encerra em ${resumo.dataFim} (${resumo.diasRestantes} dia(s)) — reavaliação da JIS`;
    const nova = await inserir<Convocacao>("convocacoes", {
      militarId: resumo.militar.id,
      inspecaoId: resumo.ultimaInspecao?.id ?? null,
      motivo, emitidaEm: hoje(),
      dataLimite: resumo.dataFim && resumo.diasRestantes >= 0 ? resumo.dataFim : addDias(hoje(), 10),
      canal: "Boletim Geral / Contato telefônico",
      status: "pendente", criadoPor: operador.id,
    });
    criadas += 1;
    await registrarAuditoria(operador, {
      acao: "CONVOCACAO_AUTOMATICA", entidade: "convocacao", entidadeId: nova.id,
      resumo: `${resumo.militar.nome} convocado automaticamente: ${motivo}`,
      detalhes: { diasAcumulados: resumo.diasAcumulados, nivel: resumo.nivel, dataFim: resumo.dataFim },
      ip: await ipAtual(),
    });
  }
  return {
    ok: true,
    sucesso: criadas ? `${criadas} convocação(ões) gerada(s) automaticamente.` : "Nenhum policial militar necessita de convocação neste momento.",
  };
}

export async function atualizarConvocacao(
  convocacaoId: number,
  status: "notificada" | "compareceu" | "nao_compareceu" | "cancelada",
): Promise<ResultadoAcao> {
  const operador = await exigirPapel("secretaria", "medico", "admin");
  const atualizadas = await atualizar<Convocacao>("convocacoes", { status }, "id", convocacaoId);
  const atualizada = atualizadas[0];
  if (!atualizada) return { ok: false, erro: "Convocação não encontrada." };
  if (status === "compareceu") {
    const vigentes = (await porColuna<Afastamento>("afastamentos", "militarId", atualizada.militarId)).filter((a) => a.situacao === "vigente");
    for (const v of vigentes) await atualizar("afastamentos", { situacao: "encerrado" }, "id", v.id);
  }
  await registrarAuditoria(operador, {
    acao: "ATUALIZAR_CONVOCACAO", entidade: "convocacao", entidadeId: convocacaoId,
    resumo: `Convocação marcada como "${status}"`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: `Convocação atualizada (${status}).` };
}
