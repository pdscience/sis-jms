-- SIS-JIS schema (port of src/db/schema.ts). All app data lives in public.
-- Access is server-side only via admin key; no RLS policies needed.

-- Enums
CREATE TYPE papel AS ENUM ('admin', 'medico', 'secretaria', 'pessoal');
CREATE TYPE situacao_militar AS ENUM ('ativo', 'agregado', 'reformado', 'licenciado', 'desligado');
CREATE TYPE status_atestado AS ENUM ('pendente', 'em_analise', 'homologado', 'nao_homologado', 'arquivado');
CREATE TYPE origem_atestado AS ENUM ('militar', 'secretaria');
CREATE TYPE parecer AS ENUM ('apto', 'apto_com_restricao', 'inapto_temporario', 'inapto_definitivo', 'necessita_lts', 'agregacao', 'reforma');
CREATE TYPE tipo_inspecao AS ENUM ('inicial', 'reavaliacao', 'ex_officio', 'agregacao', 'reforma');
CREATE TYPE status_inspecao AS ENUM ('rascunho', 'emitida', 'homologada', 'publicada');
CREATE TYPE tipo_afastamento AS ENUM ('lts', 'tratamento_saude', 'dispensa_atividade', 'agregacao');
CREATE TYPE situacao_afastamento AS ENUM ('vigente', 'prorrogado', 'encerrado');
CREATE TYPE status_convocacao AS ENUM ('pendente', 'notificada', 'compareceu', 'nao_compareceu', 'cancelada');

-- Usuários / RBAC
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  login TEXT NOT NULL,
  email TEXT,
  senha_hash TEXT NOT NULL,
  papel papel NOT NULL DEFAULT 'secretaria',
  posto TEXT,
  crm TEXT,
  especialidade TEXT,
  om TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acesso TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX usuarios_login_uidx ON usuarios (login);

-- Militares
CREATE TABLE militares (
  id SERIAL PRIMARY KEY,
  nip TEXT NOT NULL,
  cpf TEXT,
  nome TEXT NOT NULL,
  nome_guerra TEXT,
  posto_graduacao TEXT NOT NULL,
  quadro TEXT,
  om TEXT NOT NULL,
  funcao TEXT,
  data_nascimento DATE,
  sexo TEXT,
  tipo_sanguineo TEXT,
  telefone TEXT,
  email TEXT,
  data_inclusao DATE,
  situacao situacao_militar NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  criado_por INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX militares_nip_uidx ON militares (nip);

-- Atestados (recepção digital)
CREATE TABLE atestados (
  id SERIAL PRIMARY KEY,
  protocolo TEXT NOT NULL,
  militar_id INTEGER NOT NULL REFERENCES militares (id) ON DELETE CASCADE,
  data_emissao DATE NOT NULL,
  data_apresentacao DATE NOT NULL,
  emitente TEXT,
  cid TEXT,
  dias_sugeridos INTEGER,
  descricao TEXT,
  origem origem_atestado NOT NULL DEFAULT 'secretaria',
  status status_atestado NOT NULL DEFAULT 'pendente',
  arquivo_nome TEXT,
  arquivo_mime TEXT,
  arquivo_base64 TEXT,
  justificativa TEXT,
  inspecao_id INTEGER,
  criado_por INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX atestados_protocolo_uidx ON atestados (protocolo);

-- Inspeções de Saúde (Ata / Parecer da Junta)
CREATE TABLE inspecoes (
  id SERIAL PRIMARY KEY,
  ata_numero TEXT NOT NULL,
  militar_id INTEGER NOT NULL REFERENCES militares (id) ON DELETE CASCADE,
  atestado_id INTEGER,
  medico_id INTEGER,
  tipo tipo_inspecao NOT NULL DEFAULT 'inicial',
  data_inspecao DATE NOT NULL,
  parecer parecer NOT NULL,
  cid TEXT,
  enquadramento_legal TEXT,
  dias_afastamento INTEGER NOT NULL DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  restringe_atividade BOOLEAN NOT NULL DEFAULT FALSE,
  descricao_clinica TEXT,
  exames_realizados TEXT,
  recomendacoes TEXT,
  necessita_reavaliacao BOOLEAN NOT NULL DEFAULT FALSE,
  data_reavaliacao DATE,
  status status_inspecao NOT NULL DEFAULT 'emitida',
  homologado_por INTEGER,
  homologado_em TIMESTAMPTZ,
  publicado_em TIMESTAMPTZ,
  bi_numero TEXT,
  criado_por INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX inspecoes_ata_numero_uidx ON inspecoes (ata_numero);

-- Afastamentos (controle de prazos e agregação)
CREATE TABLE afastamentos (
  id SERIAL PRIMARY KEY,
  militar_id INTEGER NOT NULL REFERENCES militares (id) ON DELETE CASCADE,
  inspecao_id INTEGER,
  tipo tipo_afastamento NOT NULL DEFAULT 'tratamento_saude',
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INTEGER NOT NULL,
  situacao situacao_afastamento NOT NULL DEFAULT 'vigente',
  agregado_desde DATE,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convocações para reavaliação
CREATE TABLE convocacoes (
  id SERIAL PRIMARY KEY,
  militar_id INTEGER NOT NULL REFERENCES militares (id) ON DELETE CASCADE,
  inspecao_id INTEGER,
  motivo TEXT NOT NULL,
  emitida_em DATE NOT NULL,
  data_limite DATE NOT NULL,
  canal TEXT NOT NULL DEFAULT 'Boletim Interno',
  status status_convocacao NOT NULL DEFAULT 'pendente',
  criado_por INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trilha de auditoria (append-only)
CREATE TABLE auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  usuario_nome TEXT NOT NULL,
  papel TEXT,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id TEXT,
  resumo TEXT,
  detalhes JSONB,
  ip TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Imutabilidade da trilha no nível do banco
CREATE OR REPLACE RULE auditoria_sem_update AS ON UPDATE TO auditoria DO INSTEAD NOTHING;
CREATE OR REPLACE RULE auditoria_sem_delete AS ON DELETE TO auditoria DO INSTEAD NOTHING;
