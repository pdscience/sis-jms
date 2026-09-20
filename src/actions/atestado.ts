import { atualizar, contar, inserir, porColuna, um } from "@/db";
import type { Atestado, Militar } from "@/db/schema";
import { exigirPapel, exigirSessao, ipAtual, usuarioAtual } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { hoje } from "@/lib/datas";
import type { ResultadoAcao } from "./auth.js";

const TAMANHO_MAXIMO = 4 * 1024 * 1024;
const MIME_PERMITIDO = ["application/pdf", "image/png", "image/jpeg"];

async function gerarProtocolo(): Promise<string> {
  const ano = new Date().getFullYear();
  const total = await contar("atestados");
  return `AT-${ano}-${String(total + 1).padStart(5, "0")}`;
}

export async function enviarAtestado(formData: FormData): Promise<ResultadoAcao> {
  const canal = String(formData.get("canal") ?? "secretaria");
  let militarId: number | null = null;
  let operador = await usuarioAtual();

  if (canal === "militar") {
    const re = String(formData.get("re") ?? "").trim();
    const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "");
    if (!re || !cpf) return { ok: false, erro: "Informe RE e CPF para identificação." };
    const candidatos = await porColuna<Militar>("militares", "re", re);
    const militar = candidatos.find((m) => (m.cpf ?? "").replace(/\D/g, "") === cpf) ?? null;
    if (!militar) return { ok: false, erro: "RE/CPF não localizado. Procure a Secretaria da sua OM." };
    militarId = militar.id;
  } else {
    operador = await exigirSessao();
    await exigirPapel("secretaria", "medico", "admin");
    const id = Number(formData.get("militarId"));
    if (!Number.isFinite(id) || id <= 0) return { ok: false, erro: "Selecione o policial militar." };
    militarId = id;
  }

  const dataEmissao = String(formData.get("dataEmissao") ?? hoje());
  const emitente = String(formData.get("emitente") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const diasSugeridos = Number(formData.get("diasSugeridos") ?? 0) || 0;
  const cid = String(formData.get("cid") ?? "").trim();

  if (!emitente || !descricao || diasSugeridos <= 0) {
    return { ok: false, erro: "Informe emitente, histórico/motivo e os dias de afastamento sugeridos." };
  }

  const arquivo = formData.get("arquivo");
  let arquivoNome: string | null = null;
  let arquivoMime: string | null = null;
  let arquivoBase64: string | null = null;

  if (arquivo instanceof File && arquivo.size > 0) {
    if (!MIME_PERMITIDO.includes(arquivo.type)) return { ok: false, erro: "Anexo deve ser PDF, PNG ou JPEG." };
    if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: "Anexo excede o limite de 4 MB." };
    arquivoNome = arquivo.name;
    arquivoMime = arquivo.type;
    arquivoBase64 = Buffer.from(await arquivo.arrayBuffer()).toString("base64");
  } else if (canal === "secretaria") {
    return { ok: false, erro: "Anexe o arquivo/imagem do atestado." };
  }

  const protocolo = await gerarProtocolo();
  const novo = await inserir<Atestado>("atestados", {
    protocolo, militarId, dataEmissao,
    dataApresentacao: String(formData.get("dataApresentacao") ?? hoje()),
    emitente, cid: cid || null, diasSugeridos, descricao,
    origem: canal === "militar" ? "militar" : "secretaria",
    status: "pendente", arquivoNome, arquivoMime, arquivoBase64,
    criadoPor: operador?.id ?? null,
  });

  await registrarAuditoria(operador, {
    acao: canal === "militar" ? "RECEBER_ATESTADO_MILITAR" : "INSERIR_ATESTADO",
    entidade: "atestado", entidadeId: novo.id,
    resumo: `Atestado ${protocolo} recebido (${canal === "militar" ? "envio do policial militar" : "secretaria"}) — ${diasSugeridos} dia(s)`,
    detalhes: { dataEmissao, diasSugeridos, emitente, anexo: arquivoNome, tamanho: arquivoBase64 ? arquivoBase64.length : 0 },
    ip: await ipAtual(),
  });

  if (canal === "militar") {
    return { ok: true, sucesso: `Atestado recebido. Protocolo ${protocolo}. Acompanhe a tramitação na sua OM.`, id: novo.id };
  }
  return { ok: true, sucesso: `Atestado ${protocolo} registrado na fila.`, id: novo.id };
}

export async function atualizarStatusAtestado(
  atestadoId: number,
  status: "pendente" | "em_analise" | "arquivado" | "nao_homologado",
  justificativa?: string,
): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  await exigirPapel("secretaria", "medico", "admin");
  const atual = await um<Atestado>("atestados", "id", atestadoId);
  if (!atual) return { ok: false, erro: "Atestado não encontrado." };
  await atualizar("atestados", { status, justificativa: justificativa?.trim() || null, atualizadoEm: new Date() }, "id", atestadoId);
  await registrarAuditoria(operador, {
    acao: "MUDAR_STATUS_ATESTADO", entidade: "atestado", entidadeId: atestadoId,
    resumo: `Atestado ${atual.protocolo}: ${atual.status} → ${status}`,
    detalhes: { de: atual.status, para: status, justificativa }, ip: await ipAtual(),
  });
  return { ok: true, sucesso: `Status atualizado para "${status}".` };
}

export async function excluirAtestado(atestadoId: number): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  if (operador.papel !== "admin") {
    return { ok: false, erro: "Apenas o presidente da Junta pode arquivar definitivamente." };
  }
  const atualizados = await atualizar<Atestado>("atestados", { status: "arquivado", atualizadoEm: new Date() }, "id", atestadoId);
  const atual = atualizados[0];
  if (!atual) return { ok: false, erro: "Atestado não encontrado." };
  await registrarAuditoria(operador, {
    acao: "ARQUIVAR_ATESTADO", entidade: "atestado", entidadeId: atestadoId,
    resumo: `Atestado ${atual.protocolo} arquivado`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Atestado arquivado." };
}
