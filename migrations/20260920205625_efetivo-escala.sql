CREATE TABLE setores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE efetivo (
  id SERIAL PRIMARY KEY,
  militar_id INTEGER REFERENCES militares (id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  posto_graduacao TEXT,
  funcao TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE escalas (
  id SERIAL PRIMARY KEY,
  semana DATE NOT NULL,
  dia SMALLINT NOT NULL CHECK (dia BETWEEN 0 AND 6),
  turno TEXT NOT NULL CHECK (turno IN ('manhã', 'tarde', 'integral', 'plantão')),
  setor_id INTEGER NOT NULL REFERENCES setores (id) ON DELETE CASCADE,
  efetivo_id INTEGER NOT NULL REFERENCES efetivo (id) ON DELETE CASCADE,
  observacao TEXT,
  criado_por INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX escalas_semana_uidx ON escalas (semana, dia, turno, setor_id, efetivo_id);
