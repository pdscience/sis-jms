import type { Atestado, Inspecao, Militar, Usuario } from "@/db/schema";
import { PARECER_LABEL, PARECER_RESUMO, STATUS_INSPECAO_LABEL, type Parecer } from "@/lib/dominio";
import { formatBR, mesPorExtenso } from "@/lib/datas";

export type AtaDados = {
  ata: Inspecao;
  militar: Militar;
  medico: Usuario | null;
  homologador: Usuario | null;
  atestado: Atestado | null;
  /** false para perfis sem acesso a dados clínicos (ex.: Seção de Pessoal). */
  completa: boolean;
};

export type SecaoAta = { titulo: string; paragrafos: string[] };

function tratamento(militar: Militar): string {
  return `${militar.postoGraduacao} ${militar.nomeGuerra ?? militar.nome}`;
}

/** Monta a Ata de Inspeção de Saúde em seções textuais (usada no PDF e na tela). */
export function secoesDaAta({
  ata,
  militar,
  medico,
  homologador,
  atestado,
  completa,
}: AtaDados): SecaoAta[] {
  const secoes: SecaoAta[] = [];

  secoes.push({
    titulo: "1. IDENTIFICAÇÃO E ABERTURA",
    paragrafos: [
      `Aos ${mesPorExtenso(ata.dataInspecao)}, reuniu-se a Junta de Inspeção de Saúde (JIS) designada para esta Organização Militar, com a finalidade de proceder à inspeção de saúde de ${tratamento(militar)}, ${militar.nome}, ${militar.postoGraduacao}${militar.quadro ? `, quadro ${militar.quadro}` : ""}, RE ${militar.re}${militar.cpf ? `, CPF ${militar.cpf}` : ""}, lotado(a) na ${militar.om}${militar.funcao ? `, exercendo a função de ${militar.funcao}` : ""}.`,
      `Tipo de inspeção: ${ata.tipo.replace("_", " ")}. Situação administrativa atual: ${militar.situacao}.`,
    ],
  });

  secoes.push({
    titulo: "2. DOCUMENTOS APRECIADOS",
    paragrafos: atestado
      ? [
          `Atestado/laudo protocolo ${atestado.protocolo}, emitido em ${formatBR(atestado.dataEmissao)} por ${atestado.emitente ?? "profissional não identificado"}, apresentado em ${formatBR(atestado.dataApresentacao)}, sugerindo ${atestado.diasSugeridos ?? 0} dia(s) de afastamento${atestado.cid && completa ? `, CID-10 ${atestado.cid}` : ""}.`,
          completa && atestado.descricao
            ? `Histórico informado: ${atestado.descricao}`
            : "Histórico clínico disponível somente aos membros da Junta (sigilo médico).",
        ]
      : ["Inspeção realizada ex officio, sem atestado prévio vinculado."],
  });

  secoes.push({
    titulo: "3. PARECER DA JUNTA",
    paragrafos: [
      `Após avaliação clínica, a Junta de Inspeção de Saúde emitiu o seguinte parecer: ${PARECER_LABEL[ata.parecer as Parecer].toUpperCase()} — ${PARECER_RESUMO[ata.parecer as Parecer]}`,
      ata.diasAfastamento > 0
        ? `Período concedido: ${ata.diasAfastamento} dia(s), de ${formatBR(ata.dataInicio)} a ${formatBR(ata.dataFim)}.`
        : "Não houve concessão de afastamento.",
      ata.enquadramentoLegal ? `Enquadramento legal: ${ata.enquadramentoLegal}.` : "",
      ata.restringeAtividade || (ata.recomendacoes && completa)
        ? `Restrições/recomendações: ${completa ? (ata.recomendacoes ?? "—") : "informadas à OM por documento apartado."}`
        : "",
      ata.necessitaReavaliacao
        ? `Necessita de reavaliação${ata.dataReavaliacao ? ` prevista para ${formatBR(ata.dataReavaliacao)}` : ""}, com convocação expedida pela Secretaria da Junta.`
        : "",
    ].filter((p) => p && p.length > 0),
  });

  if (completa) {
    secoes.push({
      titulo: "4. REGISTRO CLÍNICO (SIGILO MÉDICO)",
      paragrafos: [
        `CID-10: ${ata.cid ?? "não informado"}.`,
        `Anamnese/evolução: ${ata.descricaoClinica ?? "não registrada."}`,
        `Exames complementares: ${ata.examesRealizados ?? "não apresentados."}`,
      ],
    });
  } else {
    secoes.push({
      titulo: "4. REGISTRO CLÍNICO",
      paragrafos: [
        "Conteúdo clínico restrito aos membros da Junta de Inspeção de Saúde, em observância ao sigilo médico e à LGPD.",
      ],
    });
  }

  secoes.push({
    titulo: completa ? "5. PROVIDÊNCIAS ADMINISTRATIVAS" : "5. PROVIDÊNCIAS ADMINISTRATIVAS",
    paragrafos: [
      `Situação da ata: ${STATUS_INSPECAO_LABEL[ata.status]}${ata.biNumero ? ` — ${ata.biNumero}` : ""}.`,
      homologador
        ? `Homologada em ${formatBR(ata.homologadoEm)} por ${homologador.nome}${homologador.crm ? ` (CRM ${homologador.crm})` : ""}.`
        : "Aguardando homologação do presidente da Junta.",
      `Publicação do extrato em Boletim Geral${ata.publicadoEm ? ` realizada em ${formatBR(ata.publicadoEm)}` : " pendente de providência da Secretaria"}.`,
    ],
  });

  secoes.push({
    titulo: "6. ENCERRAMENTO E ASSINATURAS",
    paragrafos: [
      `Nada mais havendo a tratar, lavrou-se a presente ata, ${ata.ataNumero}, que será assinada pelos membros da Junta e publicada em Boletim Geral.`,
      medico
        ? `Médico avaliador: ${medico.nome}${medico.crm ? ` — CRM ${medico.crm}` : ""}${medico.especialidade ? ` (${medico.especialidade})` : ""}.`
        : "Médico avaliador: não informado.",
      homologador
        ? `Presidente da JIS: ${homologador.nome}${homologador.posto ? ` — ${homologador.posto}` : ""}.`
        : "Presidente da JIS: ______________________",
    ],
  });

  return secoes;
}

/** Extrato enxuto para publicação em Boletim Geral (sem dados clínicos). */
export function extratoParaBI({ ata, militar }: AtaDados): string {
  const periodo =
    ata.diasAfastamento > 0
      ? `, com afastamento de ${ata.diasAfastamento} dia(s), no período de ${formatBR(ata.dataInicio)} a ${formatBR(ata.dataFim)}`
      : "";
  const legal = ata.enquadramentoLegal ? `, com fundamento no ${ata.enquadramentoLegal}` : "";
  return `JUNTA DE INSPEÇÃO DE SAÚDE — ${ata.ataNumero}: o(a) ${tratamento(militar)}, RE ${militar.re}, ${militar.om}, foi julgado(a) "${PARECER_LABEL[ata.parecer as Parecer].toUpperCase()}" em inspeção de saúde realizada em ${formatBR(ata.dataInspecao)}${periodo}${legal}. (Dados clínicos preservados em prontuário sigiloso.)`;
}
