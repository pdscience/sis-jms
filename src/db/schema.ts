/* Tipos das linhas (camelCase) — espelham as tabelas criadas na migration
   sis-jis-schema. Timestamps chegam do backend como strings ISO. */

export type Usuario = {
  id: number;
  nome: string;
  login: string;
  email: string | null;
  senhaHash: string;
  papel: string;
  posto: string | null;
  crm: string | null;
  especialidade: string | null;
  om: string | null;
  ativo: boolean;
  ultimoAcesso: string | null;
  criadoEm: string;
};

export type Militar = {
  id: number;
  re: string;
  cpf: string | null;
  nome: string;
  nomeGuerra: string | null;
  postoGraduacao: string;
  quadro: string | null;
  om: string;
  funcao: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  tipoSanguineo: string | null;
  telefone: string | null;
  email: string | null;
  dataInclusao: string | null;
  situacao: string;
  observacoes: string | null;
  criadoPor: number | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type Atestado = {
  id: number;
  protocolo: string;
  militarId: number;
  dataEmissao: string;
  dataApresentacao: string;
  emitente: string | null;
  cid: string | null;
  diasSugeridos: number | null;
  descricao: string | null;
  origem: string;
  status: string;
  arquivoNome: string | null;
  arquivoMime: string | null;
  arquivoBase64: string | null;
  justificativa: string | null;
  inspecaoId: number | null;
  criadoPor: number | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type Inspecao = {
  id: number;
  ataNumero: string;
  militarId: number;
  atestadoId: number | null;
  medicoId: number | null;
  tipo: string;
  dataInspecao: string;
  parecer: string;
  cid: string | null;
  enquadramentoLegal: string | null;
  diasAfastamento: number;
  dataInicio: string | null;
  dataFim: string | null;
  restringeAtividade: boolean;
  descricaoClinica: string | null;
  examesRealizados: string | null;
  recomendacoes: string | null;
  necessitaReavaliacao: boolean;
  dataReavaliacao: string | null;
  status: string;
  homologadoPor: number | null;
  homologadoEm: string | null;
  publicadoEm: string | null;
  biNumero: string | null;
  criadoPor: number | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type Afastamento = {
  id: number;
  militarId: number;
  inspecaoId: number | null;
  tipo: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
  situacao: string;
  agregadoDesde: string | null;
  observacoes: string | null;
  criadoEm: string;
};

export type Convocacao = {
  id: number;
  militarId: number;
  inspecaoId: number | null;
  motivo: string;
  emitidaEm: string;
  dataLimite: string;
  canal: string;
  status: string;
  criadoPor: number | null;
  criadoEm: string;
};

export type AuditoriaRow = {
  id: number;
  usuarioId: number | null;
  usuarioNome: string;
  papel: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  resumo: string | null;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
  criadoEm: string;
};

export type Setor = { id: number; nome: string; descricao: string | null; ativo: boolean };
export type Efetivo = {
  id: number; militarId: number | null; nome: string; postoGraduacao: string | null;
  funcao: string | null; telefone: string | null; ativo: boolean;
  criadoEm: string; atualizadoEm: string;
};
export type Escala = {
  id: number; semana: string; dia: number; turno: string; setorId: number;
  efetivoId: number; observacao: string | null; criadoPor: number | null; criadoEm: string;
};
