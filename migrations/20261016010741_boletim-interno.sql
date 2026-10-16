CREATE TABLE boletins (
  id SERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  semana DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  secao2 TEXT,
  secao3 TEXT,
  secao4 TEXT,
  escala_snapshot JSONB,
  criado_por INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  publicado_por INTEGER,
  publicado_em TIMESTAMPTZ
);
CREATE UNIQUE INDEX boletins_ano_numero_uidx ON boletins (ano, numero);
