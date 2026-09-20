/**
 * Domínio da Junta de Inspeção de Saúde (JIS)
 * Rótulos, listas de apoio e regras de negócio compartilhadas.
 */

export type Papel = "admin" | "medico" | "secretaria" | "pessoal";

export const PAPEL_LABEL: Record<Papel, string> = {
  admin: "Presidente da Junta / Administrador",
  medico: "Médico Avaliador",
  secretaria: "Secretaria da Junta",
  pessoal: "Seção de Pessoal (P1)",
};

/** Quem pode visualizar dados clínicos sigilosos (CID, anamnese, exames). */
export const ACESSO_SIGILO: Papel[] = ["admin", "medico"];

export const POSTOS_GRADUACOES = [
  "Coronel",
  "Tenente-Coronel",
  "Major",
  "Capitão",
  "1º Tenente",
  "2º Tenente",
  "Aspirante-a-Oficial",
  "Subtenente",
  "1º Sargento",
  "2º Sargento",
  "3º Sargento",
  "Cabo",
  "Soldado",
  "Aluno (CFAP)",
] as const;

export const QUADROS = [
  "QOPM",
  "QPPM",
  "QOSPM",
  "Quadro de Saúde",
  "Efetivo Temporário",
] as const;

export const SITUACAO_MILITAR_LABEL: Record<string, string> = {
  ativo: "Ativo",
  agregado: "Agregado",
  reformado: "Reformado",
  licenciado: "Licenciado",
  desligado: "Desligado da OM",
};

/* ---------------------------- Pareceres ---------------------------- */

export type Parecer =
  | "apto"
  | "apto_com_restricao"
  | "inapto_temporario"
  | "inapto_definitivo"
  | "necessita_lts"
  | "agregacao"
  | "reforma";

export const PARECER_LABEL: Record<Parecer, string> = {
  apto: "Apto",
  apto_com_restricao: "Apto com restrição",
  inapto_temporario: "Inapto temporário",
  inapto_definitivo: "Inapto definitivo",
  necessita_lts: "Necessita de LTS",
  agregacao: "Proposta de agregação",
  reforma: "Proposta de reforma",
};

export const PARECER_RESUMO: Record<Parecer, string> = {
  apto: "Sem restrições para o serviço policial-militar.",
  apto_com_restricao:
    "Apto, com restrições às atividades especificadas na ata.",
  inapto_temporario:
    "Incapacidade temporária, com prazo de afastamento concedido.",
  inapto_definitivo:
    "Incapacidade definitiva para o serviço policial-militar.",
  necessita_lts: "Licença para Tratamento de Saúde (LTS) concedida.",
  agregacao:
    "Afastamento superior ao limite legal — propor agregação.",
  reforma: "Encaminhado para fins de reforma.",
};

export const STATUS_ATESTADO_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  homologado: "Homologado",
  nao_homologado: "Não homologado",
  arquivado: "Arquivado",
};

export const STATUS_INSPECAO_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  emitida: "Emitida",
  homologada: "Homologada",
  publicada: "Publicada em BG",
};

export const STATUS_CONVOCACAO_LABEL: Record<string, string> = {
  pendente: "Pendente",
  notificada: "Notificada",
  compareceu: "Compareceu",
  nao_compareceu: "Não compareceu",
  cancelada: "Cancelada",
};

export const TIPO_INSPECAO_LABEL: Record<string, string> = {
  inicial: "Inspeção inicial",
  reavaliacao: "Reavaliação",
  ex_officio: "Ex officio",
  agregacao: "Agregação",
  reforma: "Reforma",
};

/* ---------------------- Enquadramentos legais ---------------------- */

export const ENQUADRAMENTOS_LEGAIS = [
  {
    valor: "Estatuto dos Policiais Militares de Rondônia — LTS",
    descricao: "Licença para tratamento de saúde.",
  },
  {
    valor: "Estatuto dos Policiais Militares de Rondônia — Prorrogação de LTS",
    descricao: "Prorrogação da licença mediante nova inspeção de saúde.",
  },
  {
    valor: "Estatuto dos Policiais Militares de Rondônia — Agregação",
    descricao: "Afastamento contínuo superior ao limite legal.",
  },
  {
    valor: "Estatuto dos Policiais Militares de Rondônia — Reforma por incapacidade definitiva",
    descricao: "Incapacidade definitiva para o serviço policial-militar.",
  },
  {
    valor: "Estatuto dos Policiais Militares de Rondônia — Enfermidade grave",
    descricao: "Moléstia grave especificada em lei.",
  },
  {
    valor: "RDPM — Dispensa de atividade",
    descricao: "Dispensa temporária de serviço, instrução ou atividade física.",
  },
  {
    valor: "Normas de perícias médicas da PMRO",
    descricao: "Normas técnicas gerais sobre perícias médicas.",
  },
  {
    valor: "Estatuto dos Policiais Militares de Rondônia — Tratamento de saúde",
    descricao: "Direito ao tratamento de saúde por conta do Estado.",
  },
] as const;

export const RESTRICOES_PADRAO = [
  "Dispensa de serviço de escala (permanência)",
  "Dispensa de atividade física / TAF",
  "Dispensa de marcha e exercícios em campanha",
  "Dispensa de manuseio de armamento",
  "Restrição a direção de viatura policial",
  "Restrição a serviço em altura / ambiente confinado",
  "Trabalho administrativo em meio expediente",
] as const;

export const CIDS_FREQUENTES = [
  "M54.5 — Lombalgia",
  "M25.5 — Dor em articulação",
  "F32.1 — Episódio depressivo moderado",
  "F41.1 — Transtorno de ansiedade generalizada",
  "J06.9 — Infecção aguda das vias aéreas superiores",
  "K29.7 — Gastrite",
  "S62.3 — Fratura ao nível do punho e da mão",
  "S82.4 — Fratura da perna (fíbula)",
  "H52.1 — Miopia",
  "I10 — Hipertensão essencial",
  "E11.9 — Diabetes mellitus tipo 2",
  "O26.9 — Assistência à gravidez",
] as const;

/* --------------------------- Regras de prazo ------------------------ */

/** Dias contínuos de afastamento que caracterizam agregação (2 anos). */
export const LIMITE_AGREGACAO_DIAS = 730;
/** Faixas de alerta do painel de prazos (dias acumulados). */
export const FAIXAS_ALERTA = [
  { chave: "regular", rotulo: "Até 30 dias", max: 30 },
  { chave: "monitorar", rotulo: "31 a 60 dias", max: 60 },
  { chave: "atencao", rotulo: "61 a 90 dias", max: 90 },
  { chave: "critico", rotulo: "Acima de 90 dias", max: Infinity },
] as const;

/** Antecedência (dias) para convocação automática de reavaliação. */
export const ANTECEDENCIA_REAVALIACAO = 7;

export type NivelAlerta = "regular" | "monitorar" | "atencao" | "critico" | "vencido";

export function nivelPorDiasAcumulados(dias: number): NivelAlerta {
  if (dias > 90) return "critico";
  if (dias > 60) return "atencao";
  if (dias > 30) return "monitorar";
  return "regular";
}

export const NIVEL_LABEL: Record<NivelAlerta, string> = {
  regular: "Regular",
  monitorar: "Monitorar",
  atencao: "Atenção",
  critico: "Crítico",
  vencido: "Afastamento vencido",
};
